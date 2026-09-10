import { app } from 'electron';

export const appVersion: string = app.isPackaged ? app.getVersion() : 'DEV';
