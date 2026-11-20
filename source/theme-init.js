'use strict';
try {
  document.documentElement.dataset.theme=localStorage.getItem('aster:theme')==='light'?'light':'dark';
} catch {
  // The default theme also works when browser storage is unavailable.
}
