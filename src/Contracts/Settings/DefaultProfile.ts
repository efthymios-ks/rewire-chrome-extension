import { deepFreeze } from '../../Common/Objects/deepFreeze';
import type { RuleProfile } from './RuleProfile';

export const DEFAULT_PROFILE: RuleProfile = deepFreeze({
    id: 'default',
    name: 'Default',
    rules: [],
    variables: [],
});
