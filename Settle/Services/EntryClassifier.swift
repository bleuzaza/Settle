import Foundation

enum EntryClassifier {
    private static let defaultTheme = "Pensées"

    static func classify(text: String, existingThemes: [String]) -> ClassificationResult {
        let kind = detectKind(text)
        let theme = classifyTheme(text, existingThemes: existingThemes)
        if kind == .note {
            return ClassificationResult(kind: .note, theme: theme, scheduledDate: nil, scheduledTime: nil)
        }
        let temporal = TemporalParser.resolveAgenda(text)
        return ClassificationResult(
            kind: .agenda,
            theme: theme,
            scheduledDate: temporal.date,
            scheduledTime: temporal.time
        )
    }

    static func classifyAndBuildEntries(text: String, source: Entry.EntrySource, existingThemes: [String]) -> [Entry] {
        let chunks = splitThoughts(text)
        let parts = chunks.isEmpty ? [text.trimmingCharacters(in: .whitespacesAndNewlines)] : chunks
        var themes = existingThemes
        var result: [Entry] = []

        for chunk in parts {
            let trimmed = chunk.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { continue }
            let c = classify(text: trimmed, existingThemes: themes)
            let display = c.kind == .agenda ? prepareAgendaText(trimmed) : polishThought(trimmed)
            guard !display.isEmpty else { continue }
            if !themes.contains(c.theme) { themes.append(c.theme) }
            let entry = Entry(
                text: display,
                theme: c.theme,
                scheduledDate: c.kind == .agenda ? c.scheduledDate : nil,
                scheduledTime: c.kind == .agenda ? c.scheduledTime : nil,
                source: source
            )
            result.append(entry)
        }
        return result
    }

    private static func splitThoughts(_ text: String) -> [String] {
        let parts = text
            .components(separatedBy: CharacterSet(charactersIn: "\n;•"))
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        return parts.count > 1 ? parts : []
    }

    private static func polishThought(_ text: String) -> String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func prepareAgendaText(_ text: String) -> String {
        var t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        t = t.replacingOccurrences(of: #"(?i)\b(je dois|il faut|penser à|penser a)\b\s*"#, with: "", options: .regularExpression)
        return t.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func detectKind(_ text: String) -> EntryKind {
        let n = normalizeFr(text)
        if noteSignals.contains(where: { n.contains($0) }) && !TemporalParser.hasMention(text) {
            return .note
        }
        if TemporalParser.hasMention(text) { return .agenda }
        if obligationSignals.contains(where: { n.contains($0) }) { return .agenda }
        if taskVerbs.contains(where: { n.contains($0) }) { return .agenda }
        if taskNouns.contains(where: { n.contains($0) }) { return .agenda }
        return .note
    }

    private static func classifyTheme(_ text: String, existingThemes: [String]) -> String {
        let n = normalizeFr(text)
        var best = defaultTheme
        var bestScore = 0
        for cat in categories where cat.theme != defaultTheme {
            var score = cat.hints.reduce(0) { acc, hint in
                n.contains(hint) ? acc + (hint.count > 5 ? 3 : 2) : acc
            }
            if score > bestScore {
                bestScore = score
                best = cat.theme
            }
        }
        if bestScore > 0 { return best }
        if let inferred = inferDynamicTheme(text, existingThemes: existingThemes) {
            return inferred
        }
        return defaultTheme
    }

    private static func inferDynamicTheme(_ text: String, existingThemes: [String]) -> String? {
        let words = text
            .components(separatedBy: .whitespacesAndNewlines)
            .map { $0.trimmingCharacters(in: .punctuationCharacters) }
            .filter { $0.count >= 4 }
        guard let first = words.first else { return nil }
        let candidate = first.prefix(1).uppercased() + first.dropFirst().lowercased()
        if existingThemes.contains(where: { normalizeFr($0) == normalizeFr(candidate) }) {
            return existingThemes.first { normalizeFr($0) == normalizeFr(candidate) }
        }
        return candidate
    }

    private static func normalizeFr(_ text: String) -> String {
        text.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "fr_FR"))
            .lowercased()
    }

    private struct Category {
        let theme: String
        let hints: [String]
    }

    private static let noteSignals = [
        "idee", "scenario", "histoire", "personnage", "dialogue", "synopsis", "reve", "songe",
        "couplet", "refrain", "paroles", "flow", "barre", "instru", "beat", "freestyle",
        "reflexion", "inspiration", "concept", "poeme", "chanson", "melodie",
    ]

    private static let obligationSignals = [
        "je dois", "il faut", "j ai a", "j ai à", "faudrait", "n oublie pas", "asap", "urgent",
    ]

    private static let taskVerbs = [
        "appeler", "rappeler", "contacter", "acheter", "payer", "envoyer", "finir", "terminer",
        "faire", "preparer", "préparer", "reserver", "réserver", "commander", "passer", "retirer",
        "remplir", "signer", "imprimer", "scanner", "telecharger", "télécharger", "installer",
        "reparer", "réparer", "nettoyer", "ranger", "organiser", "valider", "soumettre", "relancer",
    ]

    private static let taskNouns = [
        "rdv", "rendez vous", "rendez-vous", "courses", "course", "facture", "devis", "dossier",
        "formulaire", "declaration", "déclaration", "paiement", "achat", "livrable", "deadline",
        "tache", "tâche", "todo",
    ]

    private static let categories: [Category] = [
        Category(theme: "Paperasse", hints: ["caf", "impot", "impots", "urssaf", "banque", "assurance", "mutuelle", "dossier", "formulaire", "france travail", "pole emploi", "passeport"]),
        Category(theme: "Courses", hints: ["acheter", "courses", "supermarche", "carrefour", "leclerc", "lidl", "riz", "pain", "lait", "drive"]),
        Category(theme: "Santé", hints: ["dentiste", "medecin", "docteur", "hopital", "pharmacie", "kine", "osteo", "ophtalmo", "vaccin", "ordonnance"]),
        Category(theme: "Temps", hints: ["rendez vous", "rdv", "demain", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche", "appeler", "rappeler"]),
        Category(theme: "Travail", hints: ["client", "mail", "email", "slack", "notion", "deadline", "reunion", "facture", "devis", "contrat", "brief", "livrable"]),
        Category(theme: "Relations", hints: ["maman", "papa", "famille", "ami", "amie", "copain", "copine", "enfant", "anniversaire", "cadeau", "message"]),
        Category(theme: "Scénario", hints: ["scenario", "film", "cinema", "histoire", "personnage", "scene", "dialogue", "synopsis", "clip", "casting", "serie"]),
        Category(theme: "Texte de rap", hints: ["rap", "couplet", "refrain", "flow", "barre", "bars", "instru", "beat", "sample", "cover", "chanson", "melodie", "rime", "mc", "freestyle", "prod"]),
        Category(theme: "Projets", hints: ["projet", "lancer", "business", "startup", "app", "application", "objectif", "plan", "strategie", "offre", "marque", "concept", "design"]),
        Category(theme: "Rêves", hints: ["reve", "songe", "cauchemar", "insomnie", "onirique"]),
        Category(theme: defaultTheme, hints: []),
    ]
}

enum TemporalParser {
    struct Resolved {
        var date: String?
        var time: String?
    }

    static func hasMention(_ text: String) -> Bool {
        resolve(text).date != nil || resolve(text).time != nil || needsAttentionToday(text)
    }

    static func resolveAgenda(_ text: String, reference: Date = Date()) -> Resolved {
        let r = resolve(text, reference: reference)
        if r.date != nil { return r }
        return Resolved(date: isoDate(reference), time: r.time)
    }

    static func resolve(_ text: String, reference: Date = Date()) -> Resolved {
        let time = extractTime(text)
        var date = extractDate(text, reference: reference)
        if date == nil, time != nil { date = isoDate(reference) }
        if date == nil, needsAttentionToday(text) { date = isoDate(reference) }
        return Resolved(date: date, time: time)
    }

    static func needsAttentionToday(_ text: String) -> Bool {
        let n = text.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "fr_FR")).lowercased()
        return n.contains("aujourdhui") || n.contains("aujourd") || n.contains("ce soir") || n.contains("maintenant") || n.contains("urgent") || n.contains("asap")
    }

    static func formatAgendaTime(_ isoTime: String) -> String {
        let parts = isoTime.split(separator: ":")
        guard let h = parts.first else { return isoTime }
        if parts.count < 2 || parts[1] == "00" { return "\(h)h" }
        return "\(h)h\(parts[1])"
    }

    private static func extractTime(_ text: String) -> String? {
        let n = text.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "fr_FR")).lowercased()
        if let m = n.range(of: #"\b(\d{1,2})h(\d{2})?\b"#, options: .regularExpression) {
            let raw = String(n[m])
            let digits = raw.replacingOccurrences(of: "h", with: ":")
            let parts = digits.split(separator: ":")
            if let h = Int(parts[0]), h >= 0, h <= 23 {
                let mVal = parts.count > 1 ? Int(parts[1]) ?? 0 : 0
                return String(format: "%02d:%02d", h, mVal)
            }
        }
        if let m = n.range(of: #"\b(\d{1,2}):(\d{2})\b"#, options: .regularExpression) {
            return String(n[m])
        }
        return nil
    }

    private static func extractDate(_ text: String, reference: Date) -> String? {
        let n = text.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "fr_FR")).lowercased()
        if n.contains("demain") { return isoDate(addDays(reference, 1)) }
        if n.contains("apres demain") || n.contains("après demain") { return isoDate(addDays(reference, 2)) }
        let weekdays = ["dimanche": 0, "lundi": 1, "mardi": 2, "mercredi": 3, "jeudi": 4, "vendredi": 5, "samedi": 6]
        for (name, target) in weekdays where n.contains(name) {
            var delta = (target - Calendar.current.component(.weekday, from: reference) + 1 + 7) % 7
            if delta == 0 || n.contains("\(name) prochain") { delta += 7 }
            return isoDate(addDays(reference, delta))
        }
        if let m = n.range(of: #"\b(20\d{2})-(\d{2})-(\d{2})\b"#, options: .regularExpression) {
            return String(n[m])
        }
        return nil
    }

    private static func isoDate(_ date: Date) -> String {
        let c = Calendar.current
        let y = c.component(.year, from: date)
        let m = c.component(.month, from: date)
        let d = c.component(.day, from: date)
        return String(format: "%04d-%02d-%02d", y, m, d)
    }

    private static func addDays(_ date: Date, _ days: Int) -> Date {
        Calendar.current.date(byAdding: .day, value: days, to: date) ?? date
    }
}
