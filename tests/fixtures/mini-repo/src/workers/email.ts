import { formatDate } from '../lib/utils';
import { getUser } from '../service/user';
export const sendEmail = (id: string) => getUser(id);
