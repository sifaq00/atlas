import { authenticate } from '../service/auth';
export const signup = () => authenticate('pass');
