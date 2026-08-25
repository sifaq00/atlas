import { dbConfig } from '../config/db';
export const client = { connect: () => dbConfig };
