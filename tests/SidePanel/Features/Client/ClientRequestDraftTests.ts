import { describe, expect, test } from "vitest";
import { CurlBashSnippet } from "../../../../src/Common/CodeGen/CurlBashSnippet";
import type { IRequestSnippet } from "../../../../src/Common/CodeGen/IRequestSnippet";
import { ClientBodyType } from "../../../../src/SidePanel/Features/Client/ClientRequest";
import { ClientRequestDraft } from "../../../../src/SidePanel/Features/Client/ClientRequestDraft";

function snippetOf(command: string): IRequestSnippet {
    return CurlBashSnippet.tryParse(command)!;
}

describe("ClientRequestDraft", () => {
    test("fromSnippet_WhenTheCommandSendsJson_ShouldFillTheJsonBodyAndKeepTheHeaders", () => {
        // Arrange
        const snippet = snippetOf("curl https://api.example.com/users -H 'Content-Type: application/json' -H 'Host: api.example.com' -b 'a=1' -d '{\"name\":\"Ada\"}'");

        // Act
        const request = ClientRequestDraft.fromSnippet(snippet);

        // Assert
        expect(request.method).toBe("POST");
        expect(request.url).toBe("https://api.example.com/users");
        expect(request.headers).toEqual([
            {
                name: "Content-Type",
                value: "application/json",
            },
            {
                name: "Cookie",
                value: "a=1",
            },
        ]);
        expect(request.body.type).toBe(ClientBodyType.Json);
        expect(request.body.text).toBe("{\"name\":\"Ada\"}");
    });

    test("fromSnippet_WhenJsonIsSentWithoutAContentType_ShouldTreatItAsJsonAndDropTheImpliedFormType", () => {
        // Arrange
        const snippet = snippetOf("curl https://api.example.com/users -d '{\"a\":1}'");

        // Act
        const request = ClientRequestDraft.fromSnippet(snippet);

        // Assert
        expect(request.body.type).toBe(ClientBodyType.Json);
        expect(request.headers).toEqual([]);
    });

    test("fromSnippet_WhenTheCommandSendsAForm_ShouldFillTheRows", () => {
        // Arrange
        const snippet = snippetOf("curl https://api.example.com/search -d 'q=ada+lovelace' -d 'page=2'");

        // Act
        const request = ClientRequestDraft.fromSnippet(snippet);

        // Assert
        expect(request.body.type).toBe(ClientBodyType.FormUrlEncoded);
        expect(request.body.formRows).toEqual([
            {
                name: "q",
                value: "ada lovelace",
            },
            {
                name: "page",
                value: "2",
            },
        ]);
    });

    test("fromSnippet_WhenTheCommandUploadsFiles_ShouldLeaveEachFileToPick", () => {
        // Arrange
        const snippet = snippetOf("curl https://api.example.com/upload -H 'Content-Type: multipart/form-data; boundary=x' -F 'title=Hello' -F 'avatar=@photo.png'");

        // Act
        const request = ClientRequestDraft.fromSnippet(snippet);

        // Assert
        expect(request.headers).toEqual([]);
        expect(request.body.type).toBe(ClientBodyType.Multipart);
        expect(request.body.multipartRows).toEqual([
            {
                name: "title",
                value: "Hello",
                isFile: false,
                file: null,
                fileName: "",
            },
            {
                name: "avatar",
                value: "",
                isFile: true,
                file: null,
                fileName: "photo.png",
            },
        ]);
    });

    test("fromSnippet_WhenTheBodyComesFromAFile_ShouldPickTheBinaryType", () => {
        // Arrange
        const snippet = snippetOf("curl -T payload.bin https://api.example.com/files/1");

        // Act
        const request = ClientRequestDraft.fromSnippet(snippet);

        // Assert
        expect(request.method).toBe("PUT");
        expect(request.body.type).toBe(ClientBodyType.Binary);
        expect(request.body.fileName).toBe("payload.bin");
    });

    test.each([
        [
            "{\"query\":\"{ users { id } }\"}",
            "application/json",
            ClientBodyType.GraphQl,
        ],
        [
            "<a/>",
            "application/xml",
            ClientBodyType.Xml,
        ],
        [
            "hello",
            "text/plain",
            ClientBodyType.Text,
        ],
    ])("fromSnippet_WhenTheBodyIs(%s)WithType(%s)_ShouldPick(%s)", (
        body,
        contentType,
        expected
    ) => {
        // Arrange
        const snippet = snippetOf(`curl https://api.example.com/x -H 'Content-Type: ${contentType}' --data-raw '${body}'`);

        // Act
        const request = ClientRequestDraft.fromSnippet(snippet);

        // Assert
        expect(request.body.type).toBe(expected);
    });

    test("fromSnippet_WhenACapturedMultipartBodyIsText_ShouldSplitItIntoRows", () => {
        // Arrange
        const body = "--b\r\nContent-Disposition: form-data; name=\"title\"\r\n\r\nHello\r\n--b--\r\n";
        const snippet = CurlBashSnippet.from({
            method: "POST",
            url: "https://api.example.com/upload",
            headers: [
                {
                    name: "Content-Type",
                    value: "multipart/form-data; boundary=b",
                },
            ],
            body,
        });

        // Act
        const request = ClientRequestDraft.fromSnippet(snippet);

        // Assert
        expect(request.body.type).toBe(ClientBodyType.Multipart);
        expect(request.body.multipartRows.map(row => `${row.name}=${row.value}`)).toEqual(["title=Hello"]);
    });
});
