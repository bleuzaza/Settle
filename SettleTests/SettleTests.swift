import XCTest
@testable import Settle

final class SettleTests: XCTestCase {
    func testClassifyNote() {
        let result = EntryClassifier.classify(text: "Une idée de scénario pour un court métrage", existingThemes: [])
        XCTAssertEqual(result.kind, .note)
        XCTAssertEqual(result.theme, "Scénario")
    }

    func testClassifyAgendaTomorrow() {
        let result = EntryClassifier.classify(text: "Appeler le dentiste demain à 17h", existingThemes: [])
        XCTAssertEqual(result.kind, .agenda)
        XCTAssertNotNil(result.scheduledDate)
        XCTAssertEqual(result.scheduledTime, "17:00")
    }
}
