import { describe, expect, test } from "vitest";
import { ClientBodies } from "../../../../src/SidePanel/Features/Client/ClientBodies";
import { ClientBodyEditor } from "../../../../src/SidePanel/Features/Client/ClientBodyEditor";
import { type ClientBody, ClientBodyType } from "../../../../src/SidePanel/Features/Client/ClientRequest";
import { buttonNamed, click, typeInto } from "../../PanelTestData";

function aBody(changes: Partial<ClientBody> = {}): ClientBody {
    return {
        ...ClientBodies.empty(),
        ...changes,
    };
}

function tabNamed(editor: ClientBodyEditor, label: string): HTMLButtonElement {
    return [...editor.root.querySelectorAll<HTMLButtonElement>(".client-body-tabs .tab")].find(tab => tab.textContent === label)!;
}

describe("ClientBodyEditor", () => {
    test("constructor_WhenBuilt_ShouldOfferEveryBodyTypeAsATab", () => {
        // Arrange
        const body = aBody();

        // Act
        const editor = new ClientBodyEditor(body);

        // Assert
        expect([...editor.root.querySelectorAll(".client-body-tabs .tab")].map(tab => tab.textContent)).toEqual([
            "None",
            "Text",
            "JSON",
            "XML",
            "Form URL-encoded",
            "Multipart form",
            "Binary",
            "GraphQL",
        ]);
        expect(tabNamed(editor, "None").getAttribute("aria-selected")).toBe("true");
    });

    test("tab_WhenJsonIsPickedAndFormatted_ShouldKeepTheIndentedText", () => {
        // Arrange
        const editor = new ClientBodyEditor(aBody());
        click(tabNamed(editor, "JSON"));
        typeInto(editor.root.querySelector("textarea")!, "{\"a\":1}");

        // Act
        click(buttonNamed(editor.root, "Format"));

        // Assert
        const body = editor.current();
        expect(body.type).toBe(ClientBodyType.Json);
        expect(body.text).toBe("{\n  \"a\": 1\n}");
    });

    test("tab_WhenTextIsPicked_ShouldOfferNoFormatButton", () => {
        // Arrange
        const editor = new ClientBodyEditor(aBody());

        // Act
        click(tabNamed(editor, "Text"));

        // Assert
        expect([...editor.root.querySelectorAll("button")].some(button => button.textContent === "Format")).toBe(false);
    });

    test("formRows_WhenTyped_ShouldShowInTheCurrentBody", () => {
        // Arrange
        const editor = new ClientBodyEditor(aBody({
            type: ClientBodyType.FormUrlEncoded,
        }));
        const [name, value] = [...editor.root.querySelectorAll<HTMLInputElement>(".client-row input")];

        // Act
        typeInto(name!, "q");
        typeInto(value!, "ada");

        // Assert
        expect(editor.current().formRows).toEqual([
            {
                name: "q",
                value: "ada",
            },
        ]);
    });

    test("multipartRow_WhenSwitchedToFile_ShouldShowAFilePicker", () => {
        // Arrange
        const editor = new ClientBodyEditor(aBody({
            type: ClientBodyType.Multipart,
        }));
        const kind = editor.root.querySelector<HTMLSelectElement>(".client-part-kind")!;

        // Act
        kind.value = "file";
        kind.dispatchEvent(new Event("change"));

        // Assert
        expect(editor.root.querySelector("input[type=file]")).not.toBeNull();
        expect(editor.current().multipartRows[0]?.isFile).toBe(true);
    });

    test("binary_WhenAFileWasNamedButNotPicked_ShouldHintAtIt", () => {
        // Arrange
        const body = aBody({
            type: ClientBodyType.Binary,
            fileName: "payload.bin",
        });

        // Act
        const editor = new ClientBodyEditor(body);

        // Assert
        const hint = editor.root.querySelector<HTMLElement>(".client-file-hint")!;
        expect(hint.hidden).toBe(false);
        expect(hint.textContent).toBe("Pick payload.bin");
    });

    test("binary_WhenAFileIsPicked_ShouldKeepItAndHideTheHint", () => {
        // Arrange
        const editor = new ClientBodyEditor(aBody({
            type: ClientBodyType.Binary,
            fileName: "payload.bin",
        }));
        const input = editor.root.querySelector<HTMLInputElement>("input[type=file]")!;
        const file = new File(["data"], "payload.bin");
        Object.defineProperty(input, "files", {
            value: [file],
        });

        // Act
        input.dispatchEvent(new Event("change"));

        // Assert
        expect(editor.current().file).toBe(file);
        expect(editor.root.querySelector<HTMLElement>(".client-file-hint")!.hidden).toBe(true);
    });

    test("fill_WhenGivenAGraphQlBody_ShouldShowTheQuery", () => {
        // Arrange
        const editor = new ClientBodyEditor(aBody());

        // Act
        editor.fill(aBody({
            type: ClientBodyType.GraphQl,
            graphQlQuery: "{ users { id } }",
        }));

        // Assert
        expect(editor.root.querySelector("textarea")!.value).toBe("{ users { id } }");
        expect(tabNamed(editor, "GraphQL").getAttribute("aria-selected")).toBe("true");
    });
});
