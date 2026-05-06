export const CATEGORIES = [
  "Letters",
  "Numbers",
  "Function keys",
  "Navigation",
  "Editing",
  "Symbols",
  "Shifted Symbols",
  "Modifiers",
  "Consumer",
  "International",
];

export const KEYCODE_CATALOG = [
  // Letters
  ...["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"].map((l) => ({
    code: l, label: l, category: "Letters", aliases: [], note: "",
  })),

  // Numbers
  { code: "N0", label: "0", category: "Numbers", aliases: [], note: "" },
  { code: "N1", label: "1", category: "Numbers", aliases: [], note: "" },
  { code: "N2", label: "2", category: "Numbers", aliases: [], note: "" },
  { code: "N3", label: "3", category: "Numbers", aliases: [], note: "" },
  { code: "N4", label: "4", category: "Numbers", aliases: [], note: "" },
  { code: "N5", label: "5", category: "Numbers", aliases: [], note: "" },
  { code: "N6", label: "6", category: "Numbers", aliases: [], note: "" },
  { code: "N7", label: "7", category: "Numbers", aliases: [], note: "" },
  { code: "N8", label: "8", category: "Numbers", aliases: [], note: "" },
  { code: "N9", label: "9", category: "Numbers", aliases: [], note: "" },

  // Function keys
  { code: "F1",  label: "F1",  category: "Function keys", aliases: [], note: "" },
  { code: "F2",  label: "F2",  category: "Function keys", aliases: [], note: "" },
  { code: "F3",  label: "F3",  category: "Function keys", aliases: [], note: "" },
  { code: "F4",  label: "F4",  category: "Function keys", aliases: [], note: "" },
  { code: "F5",  label: "F5",  category: "Function keys", aliases: [], note: "" },
  { code: "F6",  label: "F6",  category: "Function keys", aliases: [], note: "" },
  { code: "F7",  label: "F7",  category: "Function keys", aliases: [], note: "" },
  { code: "F8",  label: "F8",  category: "Function keys", aliases: [], note: "" },
  { code: "F9",  label: "F9",  category: "Function keys", aliases: [], note: "" },
  { code: "F10", label: "F10", category: "Function keys", aliases: [], note: "" },
  { code: "F11", label: "F11", category: "Function keys", aliases: [], note: "" },
  { code: "F12", label: "F12", category: "Function keys", aliases: [], note: "" },

  // Navigation
  { code: "UP_ARROW",    label: "↑ Up",      category: "Navigation", aliases: ["UP"],    note: "" },
  { code: "DOWN_ARROW",  label: "↓ Down",    category: "Navigation", aliases: ["DOWN"],  note: "" },
  { code: "LEFT_ARROW",  label: "← Left",    category: "Navigation", aliases: ["LEFT"],  note: "" },
  { code: "RIGHT_ARROW", label: "→ Right",   category: "Navigation", aliases: ["RIGHT"], note: "" },
  { code: "HOME",        label: "Home",      category: "Navigation", aliases: [],        note: "" },
  { code: "END",         label: "End",       category: "Navigation", aliases: [],        note: "" },
  { code: "PAGE_UP",     label: "Page Up",   category: "Navigation", aliases: ["PG_UP"], note: "" },
  { code: "PAGE_DOWN",   label: "Page Down", category: "Navigation", aliases: ["PG_DN"], note: "" },

  // Editing
  { code: "ESCAPE",      label: "Esc",         category: "Editing", aliases: ["ESC"],                   note: "Escape" },
  { code: "ENTER",       label: "Enter",       category: "Editing", aliases: ["RETURN", "RET"],          note: "" },
  { code: "TAB",         label: "Tab",         category: "Editing", aliases: [],                        note: "" },
  { code: "SPACE",       label: "Space",       category: "Editing", aliases: ["SPC"],                   note: "" },
  { code: "BACKSPACE",   label: "Backspace",   category: "Editing", aliases: ["BSPC"],                  note: "" },
  { code: "DEL",         label: "Delete",      category: "Editing", aliases: ["DELETE"],                note: "" },
  { code: "INSERT",      label: "Insert",      category: "Editing", aliases: ["INS"],                   note: "" },
  { code: "CAPS",        label: "Caps Lock",   category: "Editing", aliases: ["CLCK", "CAPS_LOCK"],     note: "" },
  { code: "PSCRN",       label: "Print Scrn",  category: "Editing", aliases: ["PRINTSCREEN"],           note: "" },
  { code: "SLCK",        label: "Scroll Lock", category: "Editing", aliases: ["SCROLLLOCK"],            note: "" },
  { code: "PAUSE_BREAK", label: "Pause",       category: "Editing", aliases: ["PAUSE"],                 note: "" },

  // Symbols
  { code: "MINUS",         label: "- Minus",      category: "Symbols", aliases: [],                       note: "Minus / Underscore" },
  { code: "EQUAL",         label: "= Equal",      category: "Symbols", aliases: [],                       note: "Equals / Plus" },
  { code: "LEFT_BRACKET",  label: "[ L Bracket",  category: "Symbols", aliases: ["LBKT", "LBRC"],         note: "" },
  { code: "RIGHT_BRACKET", label: "] R Bracket",  category: "Symbols", aliases: ["RBKT", "RBRC"],         note: "" },
  { code: "BACKSLASH",     label: "\\ Backslash", category: "Symbols", aliases: ["BSLH"],                 note: "Backslash / Pipe" },
  { code: "SEMICOLON",     label: "; Semicolon",  category: "Symbols", aliases: ["SEMI"],                 note: "Semicolon / Colon" },
  { code: "SINGLE_QUOTE",  label: "' Quote",      category: "Symbols", aliases: ["SQT", "APOS"],          note: "Apostrophe / Quote" },
  { code: "GRAVE",         label: "` Grave",      category: "Symbols", aliases: [],                       note: "Grave / Tilde" },
  { code: "COMMA",         label: ", Comma",      category: "Symbols", aliases: [],                       note: "Comma / Less-than" },
  { code: "PERIOD",        label: ". Period",     category: "Symbols", aliases: ["DOT"],                  note: "Period / Greater-than" },
  { code: "SLASH",         label: "/ Slash",      category: "Symbols", aliases: ["FSLH"],                 note: "Slash / Question mark" },

  // Shifted Symbols
  { code: "EXCL",  label: "! Exclamation", category: "Shifted Symbols", aliases: ["EXCLAMATION"],          note: "Shift+1" },
  { code: "AT",    label: "@ At",          category: "Shifted Symbols", aliases: [],                       note: "Shift+2" },
  { code: "HASH",  label: "# Hash",        category: "Shifted Symbols", aliases: [],                       note: "Shift+3" },
  { code: "DLLR",  label: "$ Dollar",      category: "Shifted Symbols", aliases: ["DOLLAR"],               note: "Shift+4" },
  { code: "PRCNT", label: "% Percent",     category: "Shifted Symbols", aliases: ["PERCENT"],              note: "Shift+5" },
  { code: "CARET", label: "^ Caret",       category: "Shifted Symbols", aliases: [],                       note: "Shift+6" },
  { code: "AMPS",  label: "& Ampersand",   category: "Shifted Symbols", aliases: ["AMPERSAND"],            note: "Shift+7" },
  { code: "STAR",  label: "* Star",        category: "Shifted Symbols", aliases: ["ASTERISK"],             note: "Shift+8" },
  { code: "LPAR",  label: "( L Paren",     category: "Shifted Symbols", aliases: ["LEFT_PARENTHESIS"],     note: "Shift+9" },
  { code: "RPAR",  label: ") R Paren",     category: "Shifted Symbols", aliases: ["RIGHT_PARENTHESIS"],    note: "Shift+0" },
  { code: "UNDER", label: "_ Underscore",  category: "Shifted Symbols", aliases: ["UNDERSCORE"],           note: "Shift+Minus" },
  { code: "PLUS",  label: "+ Plus",        category: "Shifted Symbols", aliases: [],                       note: "Shift+Equal" },
  { code: "LBRC",  label: "{ L Brace",     category: "Shifted Symbols", aliases: ["LEFT_BRACE"],           note: "Shift+[" },
  { code: "RBRC",  label: "} R Brace",     category: "Shifted Symbols", aliases: ["RIGHT_BRACE"],          note: "Shift+]" },
  { code: "PIPE",  label: "| Pipe",        category: "Shifted Symbols", aliases: [],                       note: "Shift+Backslash" },
  { code: "COLON", label: ": Colon",       category: "Shifted Symbols", aliases: [],                       note: "Shift+Semicolon" },
  { code: "DQT",   label: "\" D-Quote",    category: "Shifted Symbols", aliases: ["DOUBLE_QUOTES"],        note: "Shift+Quote" },
  { code: "TILDE", label: "~ Tilde",       category: "Shifted Symbols", aliases: [],                       note: "Shift+Grave" },
  { code: "LT",    label: "< Less-than",   category: "Shifted Symbols", aliases: ["LESS_THAN"],            note: "Shift+Comma" },
  { code: "GT",    label: "> Greater-than",category: "Shifted Symbols", aliases: ["GREATER_THAN"],         note: "Shift+Period" },
  { code: "QMARK", label: "? Question",    category: "Shifted Symbols", aliases: ["QUESTION"],             note: "Shift+Slash" },

  // Modifiers
  { code: "LEFT_SHIFT",    label: "L Shift", category: "Modifiers", aliases: ["LSHFT", "LSHIFT"],           note: "" },
  { code: "RIGHT_SHIFT",   label: "R Shift", category: "Modifiers", aliases: ["RSHFT", "RSHIFT"],           note: "" },
  { code: "LEFT_CONTROL",  label: "L Ctrl",  category: "Modifiers", aliases: ["LCTRL", "LCTL"],             note: "" },
  { code: "RIGHT_CONTROL", label: "R Ctrl",  category: "Modifiers", aliases: ["RCTRL", "RCTL"],             note: "" },
  { code: "LEFT_ALT",      label: "L Alt",   category: "Modifiers", aliases: ["LALT"],                      note: "" },
  { code: "RIGHT_ALT",     label: "R Alt",   category: "Modifiers", aliases: ["RALT"],                      note: "AltGr" },
  { code: "LEFT_GUI",      label: "L Win",   category: "Modifiers", aliases: ["LGUI", "LWIN", "LCMD"],      note: "Win / Cmd" },
  { code: "RIGHT_GUI",     label: "R Win",   category: "Modifiers", aliases: ["RGUI", "RWIN", "RCMD"],      note: "Win / Cmd" },

  // Consumer
  { code: "C_VOL_UP",  label: "Volume Up",     category: "Consumer", aliases: ["C_VOLUME_UP", "volume"],         note: "Consumer volume up" },
  { code: "C_VOL_DN",  label: "Volume Down",   category: "Consumer", aliases: ["C_VOLUME_DOWN", "volume"],       note: "Consumer volume down" },
  { code: "C_MUTE",    label: "Mute",          category: "Consumer", aliases: ["mute"],                          note: "Consumer mute" },
  { code: "C_PP",      label: "Play / Pause",  category: "Consumer", aliases: ["C_PLAY_PAUSE", "media"],         note: "Consumer media play/pause" },
  { code: "C_PLAY",    label: "Play",          category: "Consumer", aliases: ["media"],                         note: "Consumer media play" },
  { code: "C_PAUSE",   label: "Pause",         category: "Consumer", aliases: ["media"],                         note: "Consumer media pause" },
  { code: "C_STOP",    label: "Stop",          category: "Consumer", aliases: ["media"],                         note: "Consumer media stop" },
  { code: "C_NEXT",    label: "Next Track",    category: "Consumer", aliases: ["media", "next"],                 note: "Consumer media next" },
  { code: "C_PREV",    label: "Previous Track",category: "Consumer", aliases: ["C_PREVIOUS", "media", "prev"],  note: "Consumer media previous" },
  { code: "C_FF",      label: "Fast Forward",  category: "Consumer", aliases: ["C_FAST_FORWARD", "media"],       note: "Consumer media fast forward" },
  { code: "C_RW",      label: "Rewind",        category: "Consumer", aliases: ["C_REWIND", "media"],             note: "Consumer media rewind" },
  { code: "C_BRI_INC", label: "Brightness Up", category: "Consumer", aliases: ["C_BRIGHTNESS_INC", "C_BRI_UP"],  note: "Consumer brightness increase" },
  { code: "C_BRI_DEC", label: "Brightness Down",category: "Consumer", aliases: ["C_BRIGHTNESS_DEC", "C_BRI_DN"],note: "Consumer brightness decrease" },

  // International / JIS
  { code: "INT_YEN",      label: "¥ INT_YEN",           category: "International", aliases: [], note: "JIS yen / backslash (left of Backspace)" },
  { code: "INT_RO",       label: "ろ INT_RO",           category: "International", aliases: [], note: "JIS ro (right of R Shift)" },
  { code: "INT_KANA",     label: "かな INT_KANA",       category: "International", aliases: [], note: "JIS kana toggle" },
  { code: "INT_HENKAN",   label: "変換 INT_HENKAN",     category: "International", aliases: [], note: "JIS henkan (convert)" },
  { code: "INT_MUHENKAN", label: "無変換 INT_MUHENKAN", category: "International", aliases: [], note: "JIS muhenkan (no-convert)" },
  { code: "LANG1",        label: "LANG1",               category: "International", aliases: [], note: "Hangul / Kana" },
  { code: "LANG2",        label: "LANG2",               category: "International", aliases: [], note: "Hanja / Eisu" },
];

export function searchCatalog(query, category = "") {
  const needle = query.trim().toLowerCase();
  return KEYCODE_CATALOG.filter((item) => {
    if (category && item.category !== category) return false;
    if (!needle) return true;
    return (
      item.code.toLowerCase().includes(needle) ||
      item.label.toLowerCase().includes(needle) ||
      item.aliases.some((a) => a.toLowerCase().includes(needle)) ||
      item.note.toLowerCase().includes(needle)
    );
  });
}
