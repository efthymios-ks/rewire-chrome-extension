import { ErrorText } from '../../Common/Errors/ErrorText';
import { Result } from '../../Common/Results/Result';
import type { DownloadOptions, FileClient, NamedText } from './FileClient';

export class ChromeFileClient implements FileClient {
    download({ text, fileName, mimeType }: DownloadOptions): void {
        const url = URL.createObjectURL(new Blob([text], {
            type: mimeType,
        }));
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    async pickTextAsync(accept: string): Promise<Result<string | null>> {
        const picked = await this.pickNamedTextAsync(accept);
        if (picked.hasErrors) {
            return Result.fail(picked.error);
        }

        return Result.ok(picked.value?.text ?? null);
    }

    pickNamedTextAsync(accept: string): Promise<Result<NamedText | null>> {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;

        return new Promise(resolve => {
            input.addEventListener('cancel', () => resolve(Result.ok(null)));
            input.addEventListener(
                /* type: */ 'change',
                /* listener: */ async () => {
                    const file = input.files?.[0];
                    if (file == null) {
                        resolve(Result.ok(null));

                        return;
                    }

                    try {
                        const text = await file.text();
                        resolve(Result.ok({
                            name: file.name,
                            text,
                        }));
                    } catch (error) {
                        resolve(Result.fail(`Reading ${file.name} failed: ${ErrorText.of(error)}`));
                    }
                },
            );
            input.click();
        });
    }
}
