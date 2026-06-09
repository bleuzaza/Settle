import Foundation

@MainActor
final class EntryStore: ObservableObject {
    static let shared = EntryStore()

    @Published private(set) var entries: [Entry] = []

    private init() {
        load()
    }

    func reload() {
        load()
    }

    func save(_ entry: Entry) {
        entries.insert(entry, at: 0)
        persist()
    }

    func saveMany(_ batch: [Entry]) {
        guard !batch.isEmpty else { return }
        entries.insert(contentsOf: batch.reversed(), at: 0)
        persist()
    }

    func delete(id: UUID) {
        entries.removeAll { $0.id == id }
        persist()
    }

    var noteGroups: [String: [Entry]] {
        Dictionary(grouping: entries.filter { !$0.isAgenda }, by: \.theme)
            .mapValues { $0.sorted { $0.createdAt > $1.createdAt } }
    }

    var agendaEntries: [Entry] {
        entries.filter(\.isAgenda).sorted { lhs, rhs in
            let ld = lhs.scheduledDate ?? ""
            let rd = rhs.scheduledDate ?? ""
            if ld != rd { return ld < rd }
            let lt = lhs.scheduledTime ?? "99:99"
            let rt = rhs.scheduledTime ?? "99:99"
            return lt < rt
        }
    }

    var existingThemes: [String] {
        Array(Set(entries.map(\.theme)))
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: AppConstants.storageKey) else {
            entries = []
            return
        }
        if let decoded = try? JSONDecoder().decode([Entry].self, from: data) {
            entries = decoded
        } else {
            entries = []
        }
    }

    private func persist() {
        guard let data = try? JSONEncoder().encode(entries) else { return }
        UserDefaults.standard.set(data, forKey: AppConstants.storageKey)
    }
}
