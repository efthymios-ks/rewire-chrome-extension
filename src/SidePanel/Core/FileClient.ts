import { ErrorText } from "../../Common/Errors/ErrorText";
import { Result } from "../../Common/Results/Result";

export interface IFileClient {
    download(
        text: string,
        fileName: string,
        mimeType: string
    ): void;
    pickText(accept: string): Promise<Result<string | null>>;
}

export class FileClient implements IFileClient {
    download(
        text: string,
        fileName: string,
        mimeType: string
    ): void {
        const url = URL.createObjectURL(new Blob([text], {
            type: mimeType,
        }));
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    pickText(accept: string): Promise<Result<string | null>> {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;

        return new Promise(resolve => {
            input.addEventListener("cancel", () => resolve(Result.ok(null)));
            input.addEventListener("change", () => {
                const file = input.files?.[0];
                if (file === undefined) {
                    resolve(Result.ok(null));

                    return;
                }

                file
                    .text()
                    .then(text => resolve(Result.ok(text)))
                    .catch((error: unknown) => resolve(Result.fail(`Reading ${file.name} failed: ${ErrorText.of(error)}`)));
            });
            input.click();
        });
    }
}
