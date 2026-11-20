'use strict';
try {
  const saved=localStorage.getItem('aster:theme');
  const preference=['light','dark','system'].includes(saved)?saved:'dark';
  const theme=preference==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):preference;
  document.documentElement.dataset.themePreference=preference;
  document.documentElement.dataset.theme=theme;
} catch {
  // The dark default is available even if browser storage is disabled.
}
