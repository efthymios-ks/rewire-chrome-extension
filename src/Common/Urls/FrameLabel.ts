import { FRAME_LABELS } from '../../Contracts/Live/FrameLabels';
import { SafeUrl } from './SafeUrl';

export const FrameLabel = {
    ofUrl(url: string): string {
        const hostname = SafeUrl.parse(url)?.hostname ?? '';

        return hostname === '' ? url : hostname;
    },

    of(url: string, isTop: boolean): string {
        return isTop ? FRAME_LABELS.Top : FrameLabel.ofUrl(url);
    },
};
