from __future__ import annotations

import json
import os
import posixpath
import re
import shutil
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import unquote, urlsplit
from uuid import uuid4
from xml.etree import ElementTree as ET
from zipfile import BadZipFile, ZipFile

import aas_core3.jsonization as aas30_jsonization
import aas_core3.xmlization as aas30_xmlization
import aas_core3_1.jsonization as aas31_jsonization
import aas_core3_1.xmlization as aas31_xmlization
from fastapi import HTTPException, UploadFile, status
from basyx.aas.adapter.aasx import (
    AASXReader,
    DictSupplementaryFileContainer,
    RELATIONSHIP_TYPE_AAS_SPEC,
    RELATIONSHIP_TYPE_AAS_SPEC_SPLIT,
    RELATIONSHIP_TYPE_AASX_ORIGIN,
)


AAS_30_NAMESPACE = "https://admin-shell.io/aas/3/0"
AAS_31_NAMESPACE = "https://admin-shell.io/aas/3/1"
IDENTIFIABLE_LIST_NAMES = (
    "assetAdministrationShells",
    "submodels",
    "conceptDescriptions",
)
MAX_PACKAGE_ENTRIES = 10_000
MAX_UNCOMPRESSED_BYTES = 500 * 1024 * 1024
STORAGE_ROOT = Path(os.getenv("AASX_STORAGE_DIR", "data/aasx"))
MAX_UPLOAD_BYTES = int(
    os.getenv("MAX_AASX_UPLOAD_BYTES", str(100 * 1024 * 1024))
)
UPLOAD_CHUNK_SIZE = 1024 * 1024


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _namespace(tag: str) -> str:
    if tag.startswith("{"):
        return tag[1:].split("}", 1)[0]
    return ""


def _relationship_source_part(rels_part: str) -> str:
    normalized = rels_part.replace("\\", "/").lstrip("/")
    if normalized == "_rels/.rels":
        return ""

    rels_directory, rels_filename = posixpath.split(normalized)
    source_directory = posixpath.dirname(rels_directory)
    source_filename = rels_filename.removesuffix(".rels")
    return posixpath.join(source_directory, source_filename)


def _resolve_relationship_target(rels_part: str, target: str) -> str | None:
    parsed = urlsplit(target.strip())
    if parsed.scheme or parsed.netloc:
        return None

    path = unquote(parsed.path).replace("\\", "/")
    if not path:
        return None
    if path.startswith("/"):
        return posixpath.normpath(path).lstrip("/")

    source_part = _relationship_source_part(rels_part)
    return posixpath.normpath(
        posixpath.join(posixpath.dirname(source_part), path)
    ).lstrip("/")


def _resolve_package_path(aas_part: str, value: str) -> str | None:
    parsed = urlsplit(value.strip())
    if parsed.scheme or parsed.netloc:
        return None

    path = unquote(parsed.path).replace("\\", "/")
    if not path:
        return None
    if path.startswith("/"):
        return posixpath.normpath(path).lstrip("/")

    return posixpath.normpath(
        posixpath.join(posixpath.dirname(aas_part.lstrip("/")), path)
    ).lstrip("/")


def _validate_aasx_package(aasx_path: Path) -> None:
    try:
        with ZipFile(aasx_path, "r") as package:
            entries = package.infolist()
            if len(entries) > MAX_PACKAGE_ENTRIES:
                raise ValueError("AASX package contains too many entries")

            total_size = sum(entry.file_size for entry in entries)
            if total_size > MAX_UNCOMPRESSED_BYTES:
                raise ValueError("AASX package is too large after decompression")

            for entry in entries:
                path = PurePosixPath(entry.filename.replace("\\", "/"))
                if path.is_absolute() or ".." in path.parts:
                    raise ValueError(
                        f"Unsafe path in AASX package: {entry.filename}"
                    )
    except BadZipFile as error:
        raise ValueError("Uploaded file is not a valid ZIP/AASX package") from error


def sanitize_aasx(source_aasx: Path, sanitized_aasx: Path) -> dict[str, Any]:
    """Repair package relationships and clear only missing local File values."""
    _validate_aasx_package(source_aasx)

    cleared_missing_file_values: list[dict[str, str]] = []
    repaired_relationships: list[dict[str, str]] = []
    sanitized_aasx.parent.mkdir(parents=True, exist_ok=True)

    with ZipFile(source_aasx, "r") as source_zip:
        package_parts = {
            posixpath.normpath(
                unquote(info.filename).replace("\\", "/").lstrip("/")
            )
            for info in source_zip.infolist()
            if not info.is_dir()
        }

        with ZipFile(sanitized_aasx, "w") as target_zip:
            for info in source_zip.infolist():
                content = source_zip.read(info.filename)

                if info.filename.lower().endswith(".rels"):
                    try:
                        root = ET.fromstring(content)
                    except ET.ParseError:
                        target_zip.writestr(info, content)
                        continue

                    changed = False
                    for relationship in root:
                        if relationship.get("TargetMode") != "External":
                            continue

                        target = relationship.get("Target", "")
                        package_path = _resolve_relationship_target(
                            info.filename, target
                        )
                        if package_path is None or package_path not in package_parts:
                            continue

                        del relationship.attrib["TargetMode"]
                        repaired_relationships.append(
                            {
                                "relsPart": info.filename,
                                "relationshipId": relationship.get("Id", ""),
                                "target": target,
                                "resolvedPackagePath": package_path,
                            }
                        )
                        changed = True

                    if changed:
                        content = ET.tostring(
                            root, encoding="utf-8", xml_declaration=True
                        )

                elif info.filename.lower().endswith(".xml"):
                    try:
                        root = ET.fromstring(content)
                    except ET.ParseError:
                        target_zip.writestr(info, content)
                        continue

                    changed = False
                    for file_element in root.iter():
                        if (
                            _local_name(file_element.tag) != "file"
                            or not _namespace(file_element.tag).startswith(
                                "https://admin-shell.io/aas/"
                            )
                        ):
                            continue

                        value_element = next(
                            (
                                child
                                for child in file_element
                                if _local_name(child.tag) == "value"
                            ),
                            None,
                        )
                        value = (
                            value_element.text.strip()
                            if value_element is not None and value_element.text
                            else ""
                        )
                        package_path = _resolve_package_path(info.filename, value)
                        if package_path is None or package_path in package_parts:
                            continue

                        id_short_element = next(
                            (
                                child
                                for child in file_element
                                if _local_name(child.tag) == "idShort"
                            ),
                            None,
                        )
                        cleared_missing_file_values.append(
                            {
                                "xmlPart": info.filename,
                                "idShort": (
                                    id_short_element.text
                                    if id_short_element is not None
                                    and id_short_element.text
                                    else ""
                                ),
                                "value": value,
                                "resolvedPackagePath": package_path,
                            }
                        )
                        if value_element is not None:
                            file_element.remove(value_element)
                        changed = True

                    if changed:
                        content = ET.tostring(
                            root, encoding="utf-8", xml_declaration=True
                        )

                target_zip.writestr(info, content)

    return {
        "clearedMissingFileValues": cleared_missing_file_values,
        "repairedRelationships": repaired_relationships,
    }


def _get_aas_parts(reader: AASXReader) -> list[str]:
    relationships = reader.reader.get_related_parts_by_type()
    origins = relationships[RELATIONSHIP_TYPE_AASX_ORIGIN]
    if not origins:
        raise ValueError("AASX origin relationship is missing")

    parts: list[str] = []
    for origin in origins:
        origin_relationships = reader.reader.get_related_parts_by_type(origin)
        for aas_part in origin_relationships[RELATIONSHIP_TYPE_AAS_SPEC]:
            if aas_part not in parts:
                parts.append(aas_part)

            split_relationships = reader.reader.get_related_parts_by_type(aas_part)
            for split_part in split_relationships[RELATIONSHIP_TYPE_AAS_SPEC_SPLIT]:
                if split_part not in parts:
                    parts.append(split_part)

    if not parts:
        raise ValueError("No AAS specification part found in AASX package")
    return parts


def _deserialize_aas_xml(content: bytes, part_name: str) -> tuple[str, dict[str, Any]]:
    try:
        root = ET.fromstring(content)
    except ET.ParseError as error:
        raise ValueError(f"Invalid AAS XML in {part_name}: {error}") from error

    namespace = _namespace(root.tag)

    # aas-core rejects XML-only attributes such as xsi:schemaLocation.
    for element in root.iter():
        element.attrib.clear()
    text = ET.tostring(root, encoding="unicode")

    if namespace == AAS_31_NAMESPACE:
        try:
            environment = aas31_xmlization.environment_from_str(text)
        except aas31_xmlization.DeserializationException as error:
            raise ValueError(
                f"Failed to deserialize AAS 3.1 XML in {part_name}: {error}"
            ) from error
        return "3.1", aas31_jsonization.to_jsonable(environment)
    if namespace == AAS_30_NAMESPACE:
        try:
            environment = aas30_xmlization.environment_from_str(text)
        except aas30_xmlization.DeserializationException as error:
            raise ValueError(
                f"Failed to deserialize AAS 3.0 XML in {part_name}: {error}"
            ) from error
        return "3.0", aas30_jsonization.to_jsonable(environment)

    raise ValueError(
        f"Unsupported AAS XML namespace in {part_name}: {namespace!r}"
    )


def _merge_environment(target: dict[str, Any], source: dict[str, Any]) -> None:
    for list_name in IDENTIFIABLE_LIST_NAMES:
        values = source.get(list_name)
        if values:
            target.setdefault(list_name, []).extend(values)


def _walk_file_values(value: Any):
    if isinstance(value, dict):
        if value.get("modelType") == "File":
            file_value = value.get("value")
            if isinstance(file_value, str) and file_value.strip():
                yield file_value
        for child in value.values():
            yield from _walk_file_values(child)
    elif isinstance(value, list):
        for child in value:
            yield from _walk_file_values(child)


def _extract_files(
    reader: AASXReader,
    parsed_parts: list[tuple[str, dict[str, Any]]],
    attachment_dir: Path,
) -> list[dict[str, Any]]:
    files = DictSupplementaryFileContainer()
    added_package_names: set[str] = set()

    for part_name, environment in parsed_parts:
        for file_value in _walk_file_values(environment):
            package_path = _resolve_package_path(part_name, file_value)
            if package_path is None:
                continue

            package_name = "/" + package_path
            if package_name in added_package_names:
                continue

            try:
                with reader.reader.open_part(package_name) as source:
                    files.add_file(
                        package_name,
                        source,
                        reader.reader.get_content_type(package_name),
                    )
            except KeyError as error:
                raise ValueError(
                    f"Missing attachment referenced by File.value: {file_value}"
                ) from error
            added_package_names.add(package_name)

    attachments: list[dict[str, Any]] = []
    for package_name in files:
        relative_path = PurePosixPath(package_name.lstrip("/"))
        if ".." in relative_path.parts:
            raise ValueError(f"Unsafe AASX file path: {package_name}")

        output_path = attachment_dir.joinpath(*relative_path.parts)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("wb") as target:
            files.write_file(package_name, target)

        attachments.append(
            {
                "packagePath": package_name,
                "objectKey": output_path.relative_to(attachment_dir.parent).as_posix(),
                "contentType": files.get_content_type(package_name),
                "sha256": files.get_sha256(package_name).hex(),
                "size": output_path.stat().st_size,
            }
        )
    return attachments


def convert_aasx(
    source_aasx: Path,
    output_dir: Path,
) -> dict[str, Any]:
    """Convert one AASX and persist its local conversion artifacts."""
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = source_aasx.stem
    sanitized_path = output_dir / f"{stem}.sanitized.aasx"
    json_path = output_dir / f"{stem}.json"
    attachment_dir = output_dir / "files"
    attachment_dir.mkdir(parents=True, exist_ok=True)

    sanitization = sanitize_aasx(source_aasx, sanitized_path)
    merged_environment: dict[str, Any] = {}
    parsed_parts: list[tuple[str, dict[str, Any]]] = []
    model_versions: list[str] = []

    with AASXReader(sanitized_path) as reader:
        for part_name in _get_aas_parts(reader):
            content_type = reader.reader.get_content_type(part_name)
            suffix = PurePosixPath(part_name).suffix.lower()
            if content_type.split(";", 1)[0].lower() not in {
                "text/xml",
                "application/xml",
                "",
            } and suffix != ".xml":
                raise ValueError(
                    f"Only XML AAS specification parts are supported: {part_name}"
                )

            with reader.reader.open_part(part_name) as source:
                version, environment = _deserialize_aas_xml(
                    source.read(), part_name
                )
            model_versions.append(version)
            parsed_parts.append((part_name, environment))
            _merge_environment(merged_environment, environment)

        attachments = _extract_files(reader, parsed_parts, attachment_dir)

    with json_path.open("w", encoding="utf-8") as target:
        json.dump(merged_environment, target, ensure_ascii=False, indent=2)

    identifiable_ids = [
        item["id"]
        for list_name in IDENTIFIABLE_LIST_NAMES
        for item in merged_environment.get(list_name, [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    ]

    return {
        "environment": merged_environment,
        "modelVersions": list(dict.fromkeys(model_versions)),
        "identifiableIds": identifiable_ids,
        "attachments": attachments,
        "clearedMissingFileValues": sanitization[
            "clearedMissingFileValues"
        ],
        "repairedRelationships": sanitization["repairedRelationships"],
        "artifacts": {
            "json": json_path.name,
            "sanitizedAasx": sanitized_path.name,
            "attachmentsDirectory": attachment_dir.name,
        },
    }


def _safe_aasx_filename(filename: str | None) -> str:
    original = Path(filename or "upload.aasx").name
    if Path(original).suffix.lower() != ".aasx":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .aasx files are accepted",
        )

    safe_stem = re.sub(r"[^0-9A-Za-z가-힣._-]+", "_", Path(original).stem)
    return f"{safe_stem or 'upload'}.aasx"


async def _save_upload(upload: UploadFile, destination: Path) -> None:
    total_size = 0
    with destination.open("wb") as target:
        while chunk := await upload.read(UPLOAD_CHUNK_SIZE):
            total_size += len(chunk)
            if total_size > MAX_UPLOAD_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"AASX file exceeds {MAX_UPLOAD_BYTES} bytes",
                )
            target.write(chunk)


async def convert_uploaded_aasx(file: UploadFile) -> dict[str, Any]:
    """Store an uploaded AASX, convert it, and return the API result."""
    filename = _safe_aasx_filename(file.filename)
    conversion_id = uuid4().hex
    conversion_dir = STORAGE_ROOT / conversion_id
    conversion_dir.mkdir(parents=True, exist_ok=False)
    source_path = conversion_dir / filename

    try:
        await _save_upload(file, source_path)
        result = convert_aasx(source_path, conversion_dir)
    except HTTPException:
        shutil.rmtree(conversion_dir, ignore_errors=True)
        raise
    except (ValueError, KeyError, OSError) as error:
        shutil.rmtree(conversion_dir, ignore_errors=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error
    finally:
        await file.close()

    return {
        "conversionId": conversion_id,
        "sourceFilename": filename,
        "modelVersions": result["modelVersions"],
        "identifiableCount": len(result["identifiableIds"]),
        "identifiableIds": result["identifiableIds"],
        "attachmentCount": len(result["attachments"]),
        "attachments": result["attachments"],
        "clearedMissingFileValues": result["clearedMissingFileValues"],
        "repairedRelationships": result["repairedRelationships"],
        "artifacts": {
            "sourceAasx": filename,
            **result["artifacts"],
        },
        "environment": result["environment"],
    }
