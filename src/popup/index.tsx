import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';

const host = document.getElementById('popup-root')!;
createRoot(host).render(<StrictMode><Popup /></StrictMode>);
