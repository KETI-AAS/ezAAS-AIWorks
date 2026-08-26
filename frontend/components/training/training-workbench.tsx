"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { ModelSelectionStep } from "@/components/training/model-selection-step"
import { DataPreprocessingStep } from "@/components/training/data-preprocessing-step"
import { ResultStep } from "@/components/training/result-step"
import { SemanticMappingStep } from "@/components/training/semantic-mapping-step"
import { TrainingStepper } from "@/components/training/training-stepper"
import {
  TrainingRunStep,
  type TrainingConfig,
  type TrainingStatus,
} from "@/components/training/training-run-step"
import { UploadStep, type UploadedFile } from "@/components/training/upload-step"
import { ValidationStep } from "@/components/training/validation-step"
import {
  TRAINING_LOG_LINES,
  TRAINING_MAPPING_ROWS,
  UPLOAD_PREVIEW_ROWS,
} from "@/lib/training-data"
import { getModel } from "@/lib/registry-data"

const DEFAULT_CONFIG: TrainingConfig = {
  intensity: "quick",
  epoch: "10",
  trainRatio: 80,
}

export function TrainingWorkbench() {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [file, setFile] = useState<UploadedFile | null>(null)
  const [mappingRows, setMappingRows] = useState(() =>
    TRAINING_MAPPING_ROWS.map((row) => ({ ...row })),
  )

  const [config, setConfig] = useState<TrainingConfig>(DEFAULT_CONFIG)
  const [status, setStatus] = useState<TrainingStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [logIndex, setLogIndex] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [])

  const selectedModel = selectedModelId ? getModel(selectedModelId) : undefined

  const goToStep = (step: number) => {
    // Only allow navigating to steps that are unlocked by prior selections.
    if (step >= 2 && !selectedModelId) {
      toast.error("먼저 AI 모델을 선택하세요")
      return
    }
    if (step >= 3 && !file) {
      toast.error("먼저 데이터를 업로드하세요")
      return
    }
    setCurrentStep(step)
  }

  const startTraining = () => {
    setStatus("running")
    setProgress(0)
    setLogIndex(0)
    if (timer.current) window.clearInterval(timer.current)

    const totalTicks = 100
    let tick = 0
    timer.current = setInterval(() => {
      tick += 1
      const pct = Math.min((tick / totalTicks) * 100, 100)
      setProgress(pct)
      setLogIndex(
        Math.min(
          Math.floor((pct / 100) * (TRAINING_LOG_LINES.length - 1)),
          TRAINING_LOG_LINES.length - 1,
        ),
      )
      if (tick >= totalTicks) {
        if (timer.current) window.clearInterval(timer.current)
        setStatus("complete")
        setLogIndex(TRAINING_LOG_LINES.length)
        setProgress(100)
        toast.success("AI Training이 완료되었습니다")
        setCurrentStep(7)
      }
    }, 60)
  }

  const stopTraining = () => {
    if (timer.current) window.clearInterval(timer.current)
    setStatus("idle")
    setProgress(0)
    setLogIndex(0)
    toast.info("학습을 중지했습니다")
  }

  const restart = () => {
    if (timer.current) window.clearInterval(timer.current)
    setCurrentStep(1)
    setSelectedModelId(null)
    setFile(null)
    setMappingRows(TRAINING_MAPPING_ROWS.map((row) => ({ ...row })))
    setConfig(DEFAULT_CONFIG)
    setStatus("idle")
    setProgress(0)
    setLogIndex(0)
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
          AI Training
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          등록된 AI 모델을 사용하여 내 데이터를 추가 학습합니다.
        </p>
      </div>

      <TrainingStepper currentStep={currentStep} onStepClick={goToStep} />

      {currentStep === 1 && (
        <ModelSelectionStep
          selectedModelId={selectedModelId}
          onSelect={setSelectedModelId}
          onNext={() => goToStep(2)}
        />
      )}

      {currentStep === 2 && (
        <UploadStep
          file={file}
          onFileChange={setFile}
          onBack={() => setCurrentStep(1)}
          onNext={() => goToStep(3)}
        />
      )}

      {currentStep === 3 && (
        <SemanticMappingStep
          mappingRows={mappingRows}
          onMappingRowsChange={setMappingRows}
          onBack={() => setCurrentStep(2)}
          onNext={() => setCurrentStep(4)}
        />
      )}

      {currentStep === 4 && (
        <ValidationStep
          mappingRows={mappingRows}
          onReupload={() => setCurrentStep(2)}
          onNext={() => setCurrentStep(5)}
        />
      )}

      {currentStep === 5 && (
        <DataPreprocessingStep
          mappingRows={mappingRows}
          sourceRowCount={file?.rowCount ?? UPLOAD_PREVIEW_ROWS.length}
          onBack={() => setCurrentStep(4)}
          onReupload={() => setCurrentStep(2)}
          onNext={() => setCurrentStep(6)}
        />
      )}

      {currentStep === 6 && (
        <TrainingRunStep
          config={config}
          onConfigChange={setConfig}
          status={status}
          progress={progress}
          logIndex={logIndex}
          onBack={() => setCurrentStep(5)}
          onStart={startTraining}
          onStop={stopTraining}
        />
      )}

      {currentStep === 7 && selectedModel && (
        <ResultStep
          model={selectedModel}
          datasetFileName={file?.name ?? "legacy_data.csv"}
          onBack={() => setCurrentStep(6)}
          onRestart={restart}
        />
      )}
    </div>
  )
}
