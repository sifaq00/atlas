import { client } from '../db/client';
import { hash } from '../lib/crypto';
export const authenticate = (pw: string) => hash(pw);
