import Foundation

struct Entry: Identifiable, Codable, Equatable {
    let id: UUID
    var text: String
    var theme: String
    var createdAt: Date
    var scheduledDate: String?
    var scheduledTime: String?
    var source: EntrySource

    enum EntrySource: String, Codable {
        case text
        case voice
    }

    init(
        id: UUID = UUID(),
        text: String,
        theme: String,
        createdAt: Date = Date(),
        scheduledDate: String? = nil,
        scheduledTime: String? = nil,
        source: EntrySource = .text
    ) {
        self.id = id
        self.text = text
        self.theme = theme
        self.createdAt = createdAt
        self.scheduledDate = scheduledDate
        self.scheduledTime = scheduledTime
        self.source = source
    }

    var isAgenda: Bool { scheduledDate != nil }
}

struct ClassificationResult {
    var kind: EntryKind
    var theme: String
    var scheduledDate: String?
    var scheduledTime: String?
}

enum EntryKind {
    case agenda
    case note
}
