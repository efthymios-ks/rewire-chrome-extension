import { ErrorText } from "../../../Common/Errors/ErrorText";
import { Result } from "../../../Common/Results/Result";
import type { HeaderEntry } from "../../../Contracts/Timeline/HeaderEntry";

const FirstRuleId = 1_000_000;
const RulePriority = 1;
const NoTabId = -1;

export interface IHandshakeHeaderRules {
    add(url: string, headers: HeaderEntry[]): Promise<Result<number>>;
    remove(ruleId: number): Promise<void>;
}

export class HandshakeHeaderRules implements IHandshakeHeaderRules {
    private _nextId = FirstRuleId;

    async add(url: string, headers: HeaderEntry[]): Promise<Result<number>> {
        const ruleId = this._nextId;
        this._nextId += 1;
        try {
            await chrome.declarativeNetRequest.updateSessionRules({
                addRules: [
                    {
                        id: ruleId,
                        priority: RulePriority,
                        action: {
                            type: "modifyHeaders",
                            requestHeaders: headers.map(header => ({
                                header: header.name,
                                operation: "set",
                                value: header.value,
                            })),
                        },
                        condition: {
                            urlFilter: `|${url}|`,
                            resourceTypes: ["websocket"],
                            tabIds: [NoTabId],
                        },
                    },
                ],
            });

            return Result.ok(ruleId);
        } catch (error) {
            return Result.fail(`Can't set the handshake headers: ${ErrorText.of(error)}`);
        }
    }

    async remove(ruleId: number): Promise<void> {
        try {
            await chrome.declarativeNetRequest.updateSessionRules({
                removeRuleIds: [ruleId],
            });
        } catch {
            return;
        }
    }
}
