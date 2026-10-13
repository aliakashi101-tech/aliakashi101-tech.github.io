import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AdminPanel } from './admin-reference/components/AdminPanel';
import { LanguageProvider } from './admin-reference/context/LanguageContext';

export default function AdminWorkspace(props) {
  return <LanguageProvider><BrowserRouter><AdminPanel {...props} /></BrowserRouter></LanguageProvider>;
}
