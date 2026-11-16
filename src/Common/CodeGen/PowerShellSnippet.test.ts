import { describe, expect, test } from 'vitest';
import { PowerShellSnippet } from './PowerShellSnippet';
import { SnippetBodies } from './SnippetBodies';
import { aSnapshot, aSnippetRequest, DEFAULTS, header } from './SnippetTestData';

describe('PowerShellSnippet', () => {
    test('toString_WhenEverythingIsIncluded_ShouldSplatParametersAndPrintStatusHeadersAndContent', () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [
                header('Content-Type', 'application/json'),
                header('User-Agent', 'Mozilla/5.0'),
                header('Accept-Encoding', 'gzip'),
                header('X-Tenant', 'blue'),
                header('Cookie', 'session=1'),
            ],
        });

        // Act
        const text = PowerShellSnippet.from(snapshot, DEFAULTS).toString();

        // Assert
        expect(text).toBe([
            '& {',
            '    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession',
            "    $session.Cookies.Add((New-Object System.Net.Cookie('session', '1', '/', 'api.example.com')))",
            '    $parameters = @{',
            "        Uri = 'https://api.example.com/users?tag=a&tag=b'",
            "        Method = 'Post'",
            '        WebSession = $session',
            '        Headers = @{',
            "            'X-Tenant' = 'blue'",
            '        }',
            "        UserAgent = 'Mozilla/5.0'",
            "        ContentType = 'application/json'",
            "        Body = [System.Text.Encoding]::UTF8.GetBytes('{\"name\":\"O''Neil\"}')",
            '        UseBasicParsing = $true',
            '    }',
            '    if ($PSVersionTable.PSVersion.Major -ge 7) {',
            '        $parameters.SkipHttpErrorCheck = $true',
            '    }',
            '    $response = Invoke-WebRequest @parameters',
            '    "Status: $($response.StatusCode) $($response.StatusDescription)"',
            "    $response.Headers.GetEnumerator() | ForEach-Object { \"$($_.Key): $($_.Value -join ', ')\" }",
            '    ""',
            '    $response.Content',
            '}',
        ].join('\n'));
        expect(text).not.toContain('`\n');
    });

    test.each([
        [
            'GET',
            "Method = 'Get'",
        ],
        [
            'MERGE',
            "Method = 'Merge'",
        ],
        [
            'PROPFIND',
            "CustomMethod = 'PROPFIND'",
        ],
    ])('toString_WhenMethodIs(%s)_ShouldPass(%s)', (method, expected) => {
        // Arrange
        const snapshot = aSnapshot({
            method,
        });

        // Act
        const text = PowerShellSnippet.from(snapshot, DEFAULTS).toString();

        // Assert
        expect(text).toContain(expected);
    });

    test('toString_WhenTheBodyHasLineBreaks_ShouldBuildThemExplicitly', () => {
        // Arrange
        const snapshot = aSnapshot({
            body: 'a\r\nb\nc',
        });

        // Act
        const text = PowerShellSnippet.from(snapshot, DEFAULTS).toString();

        // Assert
        expect(text).toContain("GetBytes(('a' + \"`r`n\" + 'b' + \"`n\" + 'c'))");
    });

    test('toString_WhenABodyLineIsAnObjectPrototypeName_ShouldQuoteItAsText', () => {
        // Arrange
        const snapshot = aSnapshot({
            body: 'toString\nconstructor',
        });

        // Act
        const text = PowerShellSnippet.from(snapshot, DEFAULTS).toString();

        // Assert
        expect(text).toContain("GetBytes(('toString' + \"`n\" + 'constructor'))");
    });

    test('toString_WhenTheMethodHasNoBody_ShouldLeaveTheBodyOut', () => {
        // Arrange
        const snapshot = aSnapshot({
            method: 'GET',
        });

        // Act
        const text = PowerShellSnippet.from(snapshot, DEFAULTS).toString();

        // Assert
        expect(text).not.toContain('Body = ');
    });

    test('toString_WhenTheBodyHoldsSmartQuotes_ShouldDoubleThem', () => {
        // Arrange
        const snapshot = aSnapshot({
            body: 'it\u2019s',
        });

        // Act
        const text = PowerShellSnippet.from(snapshot, DEFAULTS).toString();

        // Assert
        expect(text).toContain("GetBytes('it\u2019\u2019s')");
    });

    test('tryParse_WhenGivenAnyText_ShouldReturnNull', () => {
        // Arrange
        const text = "Invoke-WebRequest -Uri 'https://api.example.com/users'";

        // Act
        const snippet = PowerShellSnippet.tryParse(text);

        // Assert
        expect(snippet).toBeNull();
    });

    test('toString_WhenTheBodyIsAFile_ShouldPassItAsInFile', () => {
        // Arrange
        const snippet = new PowerShellSnippet(aSnippetRequest({
            body: SnippetBodies.file('payload.bin'),
        }));

        // Act
        const text = snippet.toString();

        // Assert
        expect(text).toContain("InFile = 'payload.bin'");
        expect(text).not.toContain('Body = ');
    });

    test('toString_WhenTheBodyIsAMultipartForm_ShouldPassAFormAndNoContentType', () => {
        // Arrange
        const snippet = new PowerShellSnippet(aSnippetRequest({
            body: SnippetBodies.multipart([
                SnippetBodies.textPart('title', 'Hello'),
                SnippetBodies.filePart({ name: 'avatar', fileName: 'photo.png', contentType: '' }),
            ]),
        }));

        // Act
        const text = snippet.toString();

        // Assert
        expect(text).toContain("'title' = 'Hello'");
        expect(text).toContain("'avatar' = Get-Item -LiteralPath 'photo.png'");
        expect(text).not.toContain('ContentType = ');
    });

    test('from_WhenTheRequestCarriesContentEncodingAndLength_ShouldLeaveBothOut', () => {
        // Arrange
        const snapshot = aSnapshot({
            headers: [
                ...aSnapshot().headers,
                header('Content-Encoding', 'gzip'),
            ],
        });

        // Act
        const text = PowerShellSnippet.from(snapshot, DEFAULTS).toString();

        // Assert
        expect(text).not.toMatch(/content-encoding/i);
        expect(text).not.toMatch(/content-length/i);
        expect(text).toContain('X-Tenant');
    });
});
