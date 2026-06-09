import AVFoundation
import Foundation
import Speech

@MainActor
final class SpeechService: ObservableObject {
    @Published var transcript = ""
    @Published var isListening = false
    @Published var errorMessage: String?

    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "fr-FR"))
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private let engine = AVAudioEngine()
    private var baseText = ""

    func start(from existingText: String) async {
        clearError()
        baseText = existingText.trimmingCharacters(in: .whitespacesAndNewlines)
        if baseText.isEmpty { transcript = "" } else { transcript = baseText }

        let speechStatus = await requestSpeechAuthorization()
        guard speechStatus == .authorized else {
            errorMessage = "Autorise la reconnaissance vocale dans Réglages."
            return
        }

        let micStatus = AVAudioApplication.shared.recordPermission
        if micStatus == .denied {
            errorMessage = "Autorise le micro dans Réglages."
            return
        }
        if micStatus == .undetermined {
            let granted = await AVAudioApplication.requestRecordPermission()
            guard granted else {
                errorMessage = "Micro refusé."
                return
            }
        }

        guard let recognizer, recognizer.isAvailable else {
            errorMessage = "Dictée indisponible."
            return
        }

        stopInternal()

        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            errorMessage = "Audio indisponible."
            return
        }

        request = SFSpeechAudioBufferRecognitionRequest()
        guard let request else { return }
        request.shouldReportPartialResults = true

        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            self?.request?.append(buffer)
        }

        task = recognizer.recognitionTask(with: request) { [weak self] result, err in
            Task { @MainActor in
                guard let self else { return }
                if let result {
                    let spoken = result.bestTranscription.formattedString
                    self.transcript = self.baseText.isEmpty ? spoken : "\(self.baseText) \(spoken)"
                }
                if err != nil || result?.isFinal == true {
                    self.stopInternal()
                }
            }
        }

        do {
            engine.prepare()
            try engine.start()
            isListening = true
        } catch {
            stopInternal()
            errorMessage = "Impossible de démarrer la dictée."
        }
    }

    func stop() async {
        stopInternal()
    }

    func clearError() {
        errorMessage = nil
    }

    private func stopInternal() {
        if engine.isRunning {
            engine.stop()
            engine.inputNode.removeTap(onBus: 0)
        }
        request?.endAudio()
        task?.cancel()
        request = nil
        task = nil
        isListening = false
        try? AVAudioSession.sharedInstance().setActive(false)
    }

    private func requestSpeechAuthorization() async -> SFSpeechRecognizerAuthorizationStatus {
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status)
            }
        }
    }
}
