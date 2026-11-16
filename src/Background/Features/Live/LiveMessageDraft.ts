import type { LiveMessage } from '../../../Contracts/Live/LiveMessage';

export type LiveMessageDraft = Omit<LiveMessage, 'id'>;
