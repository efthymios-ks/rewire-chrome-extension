import { describe, expect, test } from "vitest";
import { SnippetBodyKind } from "../../../../src/Common/CodeGen/SnippetBody";
import { ClientBodies } from "../../../../src/SidePanel/Features/Client/ClientBodies";
import { type ClientBody, ClientBodyType } from "../../../../src/SidePanel/Features/Client/ClientRequest";

function aBody(type: ClientBodyType, changes: Partial<ClientBody> = {}): ClientBody {
    return {
        ...ClientBodies.empty(),
        type,
        ...changes,
    };
}

const PhotoFile = new File(
    ["png-bytes"],
    "photo.png",
    {
        type: "image/png",
    }
);
const UntypedFile = new File(["raw"], "payload.bin");

describe("ClientBodies", () => {
    test.each([
        [
            ClientBodyType.None,
            null,
        ],
        [
            ClientBodyType.Text,
            "text/plain",
        ],
        [
            ClientBodyType.Json,
            "application/json",
        ],
        [
            ClientBodyType.Xml,
            "application/xml",
        ],
        [
            ClientBodyType.FormUrlEncoded,
            "application/x-www-form-urlencoded",
        ],
        [
            ClientBodyType.Multipart,
            null,
        ],
        [
            ClientBodyType.GraphQl,
            "application/json",
        ],
    ])("contentTypeOf_WhenTheTypeIs(%s)_ShouldReturn(%s)", (type, expected) => {
        // Arrange
        const body = aBody(type);

        // Act
        const contentType = ClientBodies.contentTypeOf(body);

        // Assert
        expect(contentType).toBe(expected);
    });

    test.each([
        [
            PhotoFile,
            "image/png",
        ],
        [
            UntypedFile,
            "application/octet-stream",
        ],
        [
            null,
            null,
        ],
    ])("contentTypeOf_WhenABinaryBodyHoldsFile(%s)_ShouldReturn(%s)", (file, expected) => {
        // Arrange
        const body = aBody(ClientBodyType.Binary, {
            file,
        });

        // Act
        const contentType = ClientBodies.contentTypeOf(body);

        // Assert
        expect(contentType).toBe(expected);
    });

    test("withContentType_WhenTheUserSetOne_ShouldKeepTheirs", () => {
        // Arrange
        const headers = [
            {
                name: "content-type",
                value: "application/vnd.api+json",
            },
        ];

        // Act
        const sent = ClientBodies.withContentType(headers, aBody(ClientBodyType.Json));

        // Assert
        expect(sent).toEqual(headers);
    });

    test("withContentType_WhenNoneIsSet_ShouldAddTheBodyTypeAndDropBlankRows", () => {
        // Arrange
        const headers = [
            {
                name: "",
                value: "",
            },
            {
                name: "Accept",
                value: "*/*",
            },
        ];

        // Act
        const sent = ClientBodies.withContentType(headers, aBody(ClientBodyType.Xml));

        // Assert
        expect(sent).toEqual([
            {
                name: "Accept",
                value: "*/*",
            },
            {
                name: "Content-Type",
                value: "application/xml",
            },
        ]);
    });

    test("fetchBodyOf_WhenTheBodyIsAForm_ShouldEncodeTheNamedRows", () => {
        // Arrange
        const body = aBody(ClientBodyType.FormUrlEncoded, {
            formRows: [
                {
                    name: "q",
                    value: "ada lovelace",
                },
                {
                    name: "",
                    value: "ignored",
                },
            ],
        });

        // Act
        const sent = ClientBodies.fetchBodyOf(body);

        // Assert
        expect(String(sent)).toBe("q=ada+lovelace");
    });

    test("fetchBodyOf_WhenTheBodyIsMultipart_ShouldSendTextAndPickedFiles", () => {
        // Arrange
        const body = aBody(ClientBodyType.Multipart, {
            multipartRows: [
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
                    file: PhotoFile,
                    fileName: "photo.png",
                },
                {
                    name: "missing",
                    value: "",
                    isFile: true,
                    file: null,
                    fileName: "later.png",
                },
            ],
        });

        // Act
        const sent = ClientBodies.fetchBodyOf(body) as FormData;

        // Assert
        expect(sent.get("title")).toBe("Hello");
        expect((sent.get("avatar") as File).name).toBe("photo.png");
        expect(sent.has("missing")).toBe(false);
    });

    test("fetchBodyOf_WhenTheBodyIsGraphQl_ShouldWrapTheQueryInJson", () => {
        // Arrange
        const body = aBody(ClientBodyType.GraphQl, {
            graphQlQuery: "{ users { id } }",
        });

        // Act
        const sent = ClientBodies.fetchBodyOf(body);

        // Assert
        expect(sent).toBe("{\"query\":\"{ users { id } }\"}");
    });

    test.each([
        [
            aBody(ClientBodyType.Binary, {
                file: PhotoFile,
            }),
            "photo.png (9 bytes)",
        ],
        [
            aBody(ClientBodyType.Multipart, {
                multipartRows: [
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
                        file: PhotoFile,
                        fileName: "photo.png",
                    },
                ],
            }),
            "title: Hello\navatar: photo.png (9 bytes)",
        ],
    ])("logTextOf_WhenTheBodyHoldsFiles(%#)_ShouldLogNamesAndSizesInsteadOfContents", (body, expected) => {
        // Arrange
        const sent = body;

        // Act
        const text = ClientBodies.logTextOf(sent);

        // Assert
        expect(text).toBe(expected);
    });

    test.each([
        "GET",
        "head",
    ])("sentWith_WhenTheMethodIs(%s)_ShouldSendNoBody", method => {
        // Arrange
        const body = aBody(ClientBodyType.Json, {
            text: "{}",
        });

        // Act
        const sent = ClientBodies.sentWith(method, body);

        // Assert
        expect(sent.type).toBe(ClientBodyType.None);
    });

    test.each([
        [
            "GET",
            ClientBodyType.FormUrlEncoded,
            true,
        ],
        [
            "head",
            ClientBodyType.Text,
            true,
        ],
        [
            "GET",
            ClientBodyType.None,
            false,
        ],
        [
            "POST",
            ClientBodyType.Json,
            false,
        ],
    ])("dropsBody_WhenTheMethodIs(%s)AndTheBodyType(%s)_ShouldReturn(%s)", (method, type, expected) => {
        // Arrange
        const body = {
            ...ClientBodies.empty(),
            type,
        };

        // Act
        const drops = ClientBodies.dropsBody(method, body);

        // Assert
        expect(drops).toBe(expected);
    });

    test("snippetBodyOf_WhenTheBodyIsMultipart_ShouldKeepNamedTextAndFileParts", () => {
        // Arrange
        const body = aBody(ClientBodyType.Multipart, {
            multipartRows: [
                {
                    name: "title",
                    value: "Cap",
                    isFile: false,
                    file: null,
                    fileName: "",
                },
                {
                    name: "photo",
                    value: "",
                    isFile: true,
                    file: PhotoFile,
                    fileName: "",
                },
                {
                    name: "empty",
                    value: "",
                    isFile: true,
                    file: null,
                    fileName: "",
                },
                {
                    name: "",
                    value: "unnamed",
                    isFile: false,
                    file: null,
                    fileName: "",
                },
            ],
        });

        // Act
        const snippetBody = ClientBodies.snippetBodyOf(body);

        // Assert
        expect(snippetBody).toEqual({
            kind: SnippetBodyKind.Multipart,
            parts: [
                {
                    name: "title",
                    value: "Cap",
                    fileName: null,
                    contentType: "",
                },
                {
                    name: "photo",
                    value: "",
                    fileName: "photo.png",
                    contentType: "image/png",
                },
            ],
        });
    });

    test.each([
        [
            UntypedFile,
            "",
            "payload.bin",
        ],
        [
            null,
            "pasted.bin",
            "pasted.bin",
        ],
    ])("snippetBodyOf_WhenTheBodyIsAFile_ShouldNameIt(%s, %s)", (file, fileName, expected) => {
        // Arrange
        const body = aBody(ClientBodyType.Binary, {
            file,
            fileName,
        });

        // Act
        const snippetBody = ClientBodies.snippetBodyOf(body);

        // Assert
        expect(snippetBody).toEqual({
            kind: SnippetBodyKind.File,
            fileName: expected,
        });
    });
});
