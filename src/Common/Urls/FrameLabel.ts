import { FrameLabels } from "../../Contracts/Live/FrameLabels";
import { SafeUrl } from "./SafeUrl";

export const FrameLabel = {
    ofUrl(url: string): string {
        return SafeUrl.parse(url)?.hostname || url;
    },

    of(url: string, isTop: boolean): string {
        return isTop ? FrameLabels.Top : FrameLabel.ofUrl(url);
    },
};
