import { describe, expect, test } from "vitest";
import { CurlBashSnippet } from "../../../../src/Common/CodeGen/CurlBashSnippet";
import { ClientBodies } from "../../../../src/SidePanel/Features/Client/ClientBodies";
import { type ClientBody, ClientBodyType, type ClientRequest } from "../../../../src/SidePanel/Features/Client/ClientRequest";
import { ClientSnippets } from "../../../../src/SidePanel/Features/Client/ClientSnippets";

function aRequest(changes: Partial<ClientRequest> = {}, body: Partial<ClientBody> = {}): ClientRequest {
    return {
        method: "POST",
        url: "https://api.example.com/orders",
        headers: [],
        body: {
            ...ClientBodies.empty(),
            ...body,
        },
        ...changes,
    };
}

describe("ClientSnippets", () => {
    test("of_WhenTheBodyIsJson_ShouldCopyTheMethodHeadersAndBody", () => {
        // Arrange
        const request = aRequest(
            {
                headers: [
                    {
                        name: "Authorization",
                        value: "Bearer abc",
                    },
                ],
            },
            {
                type: ClientBodyType.Json,
                text: "{\"sku\":\"CAP\"}",
            }
        );

        // Act
        const snippet = ClientSnippets.of(request, CurlBashSnippet.id);

        // Assert
        expect(snippet).toContain("curl 'https://api.example.com/orders'");
        expect(snippet).toContain("-H 'Authorization: Bearer abc'");
        expect(snippet).toContain("-H 'Content-Type: application/json'");
        expect(snippet).toContain("{\"sku\":\"CAP\"}");
    });

    test("of_WhenACacheHeaderIsTyped_ShouldKeepIt", () => {
        // Arrange
        const request = aRequest({
            method: "GET",
            headers: [
                {
                    name: "If-None-Match",
                    value: "\"v1\"",
                },
            ],
        });

        // Act
        const snippet = ClientSnippets.of(request, CurlBashSnippet.id);

        // Assert
        expect(snippet).toContain("If-None-Match");
    });

    test("of_WhenTheBodyIsMultipartWithAFile_ShouldCopyTextAndFileParts", () => {
        // Arrange
        const request = aRequest(
            {},
            {
                type: ClientBodyType.Multipart,
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
                        file: new File(
                            ["png-bytes"],
                            "photo.png",
                            {
                                type: "image/png",
                            }
                        ),
                        fileName: "",
                    },
                ],
            }
        );

        // Act
        const snippet = ClientSnippets.of(request, CurlBashSnippet.id);

        // Assert
        expect(snippet).toContain("-F 'title=Cap'");
        expect(snippet).toContain("-F 'photo=@photo.png;type=image/png'");
    });

    test("of_WhenTheBodyIsAFile_ShouldCopyItAsBinaryData", () => {
        // Arrange
        const request = aRequest(
            {},
            {
                type: ClientBodyType.Binary,
                fileName: "payload.bin",
            }
        );

        // Act
        const snippet = ClientSnippets.of(request, CurlBashSnippet.id);

        // Assert
        expect(snippet).toContain("--data-binary '@payload.bin'");
    });

    test("of_WhenAGetCarriesABody_ShouldCopyTheBodyToo", () => {
        // Arrange
        const request = aRequest(
            {
                method: "GET",
            },
            {
                type: ClientBodyType.FormUrlEncoded,
                formRows: [
                    {
                        name: "grant_type",
                        value: "client_credentials",
                    },
                ],
            }
        );

        // Act
        const snippet = ClientSnippets.of(request, CurlBashSnippet.id);

        // Assert
        expect(snippet).toContain("-X GET");
        expect(snippet).toContain("grant_type=client_credentials");
    });
});
