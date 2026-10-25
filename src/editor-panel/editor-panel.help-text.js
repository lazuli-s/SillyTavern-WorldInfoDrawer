// The entry editor's help text: one entry per field title and checkbox that
// carries a ? help icon. Keyed by the host control's `name` attribute — a name
// survives a host translation, a title's text does not — plus two keys of our
// own, `actions` (the move / duplicate / delete buttons) and `entryTags` (our
// Entry tags row). English only for now; translation keys are their own task.
//
// The texts are the owner-approved table of 2026-10-25 in the task
// `2026-10-17_Rework_entry-editor-field-titles-and-controls`, word for word.
// The table's markdown emphasis (*At Depth*, `{{outlet::Name}}`) is dropped:
// a hover text and a bubble render plain text.

/** Where the ? goes for a field. */
export const HELP_KIND = Object.freeze({
  /** After a field title. */
  TITLE: 'title',
  /** After a checkbox's label text, inside the `<label>`. */
  CHECKBOX: 'checkbox',
  /** The host's own ? link (Inclusion Group): restyled, never doubled. */
  LINK: 'link',
});

const help = (label, kind, text) => Object.freeze({ label, kind, text });

/** Field key → `{ label, kind, text }`. `label` names the field for assistive technology. */
export const FIELD_HELP = Object.freeze({
  comment: help(
    'Title',
    HELP_KIND.TITLE,
    "A name for this entry, just for you. The AI never sees it, and it doesn't affect when the entry triggers.",
  ),
  entryStateSelector: help(
    'Strategy',
    HELP_KIND.TITLE,
    '🔵 Constant: always inserted. 🟢 Normal: inserted only when a keyword appears in the chat. 🔗 Vectorized: inserted when the chat is similar in meaning (needs Vector Storage).',
  ),
  position: help(
    'Position',
    HELP_KIND.TITLE,
    "Where in the prompt this entry's text is placed. Placing it after the character definitions gives it more influence than placing it before them. Author's Note positions do nothing when the Author's Note is off. Outlet puts nothing in the prompt by itself; you place it with an outlet macro.",
  ),
  depth: help(
    'Depth',
    HELP_KIND.TITLE,
    'Only for At Depth positions: how many messages up from the bottom of the chat the text goes. 0 means the very end.',
  ),
  order: help(
    'Order',
    HELP_KIND.TITLE,
    'When several entries activate together, this decides their order. Higher numbers go nearer the end of the prompt, where they have more influence. In an outlet it runs the other way: entries with the same outlet name are joined highest number first.',
  ),
  probability: help(
    'Trigger %',
    HELP_KIND.TITLE,
    'The chance this entry is really inserted once it activates. 100 means always, 50 a coin flip, 0 never.',
  ),
  actions: help(
    'Actions',
    HELP_KIND.TITLE,
    'Move or copy this entry to another lorebook, duplicate it, or delete it.',
  ),
  key: help(
    'Primary Keywords',
    HELP_KIND.TITLE,
    'Words that switch this entry on when they appear in the chat. Separate them with commas. Regex patterns work too.',
  ),
  entryLogicType: help(
    'Logic',
    HELP_KIND.TITLE,
    'How the Optional Filter combines with the keywords. AND ANY: a keyword plus any one filter word. AND ALL: a keyword plus every filter word. NOT ANY: a keyword and none of the filter words. NOT ALL: blocked only when every filter word is present.',
  ),
  keysecondary: help(
    'Optional Filter',
    HELP_KIND.TITLE,
    'Extra words checked together with the main keywords, using the Logic rule. Leave it empty to ignore it.',
  ),
  outletName: help(
    'Outlet Name',
    HELP_KIND.TITLE,
    'The name of a collection point. Put {{outlet::Name}} in your prompt, and it is replaced by every entry with this outlet name. Capital letters matter.',
  ),
  scanDepth: help(
    'Scan Depth',
    HELP_KIND.TITLE,
    "How many recent messages are searched for this entry's keywords. 1 means only the last message. Leave it empty to use the global setting.",
  ),
  caseSensitive: help(
    'Case-Sensitive',
    HELP_KIND.TITLE,
    'When on, capital letters must match exactly: "Rose" won\'t match "rose".',
  ),
  matchWholeWords: help(
    'Whole Words',
    HELP_KIND.TITLE,
    'When on, a keyword only matches a complete word: "king" won\'t match "liking". Turn it off for Japanese or Chinese.',
  ),
  useGroupScoring: help(
    'Group Scoring',
    HELP_KIND.TITLE,
    'Inside an inclusion group, the entries that matched the most keywords win, and the rest are dropped.',
  ),
  automationId: help(
    'Automation ID',
    HELP_KIND.TITLE,
    'When this entry activates, it runs the Quick Reply that has the same Automation ID.',
  ),
  delayUntilRecursionLevel: help(
    'Recursion Level',
    HELP_KIND.TITLE,
    'Only used with Delay until recursion. Delayed entries take turns by level: level 1 is checked first, and a higher level gets its turn only once the lower levels stop switching on new entries. Empty means level 1.',
  ),
  content: help(
    'Content',
    HELP_KIND.TITLE,
    'The text added to the prompt when this entry activates.',
  ),
  excludeRecursion: help(
    'Non-recursable',
    HELP_KIND.CHECKBOX,
    "Other entries' text can't switch this entry on.",
  ),
  preventRecursion: help(
    'Prevent further recursion',
    HELP_KIND.CHECKBOX,
    "Once active, this entry's text won't switch on any other entries.",
  ),
  delay_until_recursion: help(
    'Delay until recursion',
    HELP_KIND.CHECKBOX,
    "This entry can only be switched on by other entries' text, never on the first pass.",
  ),
  ignoreBudget: help(
    'Ignore budget',
    HELP_KIND.CHECKBOX,
    'This entry is inserted even when the lorebook budget is already full, as long as its other checks pass.',
  ),
  group: help(
    'Inclusion Group',
    HELP_KIND.LINK,
    'Entries with the same group name compete, and only one of them gets in. The winner is random, weighted by Group Weight. Separate several groups with commas.',
  ),
  groupOverride: help(
    'Prioritize',
    HELP_KIND.CHECKBOX,
    'Instead of a random winner, the group entry with the highest Order wins.',
  ),
  groupWeight: help(
    'Group Weight',
    HELP_KIND.TITLE,
    "The chance this entry wins its inclusion group's random draw. Higher means more likely. Default 100.",
  ),
  sticky: help(
    'Sticky',
    HELP_KIND.TITLE,
    'Stays active for this many messages after it triggers. 💬 = counted in chat messages.',
  ),
  cooldown: help(
    'Cooldown',
    HELP_KIND.TITLE,
    "After it triggers, it can't trigger again for this many messages. If Sticky is also set, the cooldown starts when Sticky ends.",
  ),
  delay: help(
    'Delay',
    HELP_KIND.TITLE,
    "Can't trigger until the chat has at least this many messages.",
  ),
  characterFilter: help(
    'Filter to Characters or Tags',
    HELP_KIND.TITLE,
    'Only use this entry with the characters and tags you pick. If you pick both, a character must be on the list and have at least one of the tags. Empty means everyone.',
  ),
  character_exclusion: help(
    'Exclude',
    HELP_KIND.CHECKBOX,
    'Flips the filter: the entry works for everyone except the listed characters and anyone with one of the tags.',
  ),
  triggers: help(
    'Filter to Generation Triggers',
    HELP_KIND.TITLE,
    'Only use this entry for these kinds of generation (normal reply, Continue, Impersonate, Swipe, Regenerate, Quiet). Nothing selected means all kinds.',
  ),
  entryTags: help(
    'Entry tags',
    HELP_KIND.TITLE,
    'Your own labels for organising entries in this drawer. They never affect when an entry activates.',
  ),
  matchCharacterDescription: help(
    'Character Description',
    HELP_KIND.CHECKBOX,
    "Also look for this entry's keywords in the character's Description, not only in the chat.",
  ),
  matchCharacterPersonality: help(
    'Character Personality',
    HELP_KIND.CHECKBOX,
    "Also look for this entry's keywords in the character's Personality.",
  ),
  matchScenario: help(
    'Scenario',
    HELP_KIND.CHECKBOX,
    "Also look for this entry's keywords in the character's Scenario.",
  ),
  matchPersonaDescription: help(
    'Persona Description',
    HELP_KIND.CHECKBOX,
    "Also look for this entry's keywords in your persona's description.",
  ),
  matchCharacterDepthPrompt: help(
    "Character's Note",
    HELP_KIND.CHECKBOX,
    "Also look for this entry's keywords in the character's Character's Note.",
  ),
  matchCreatorNotes: help(
    "Creator's Notes",
    HELP_KIND.CHECKBOX,
    "Also look for this entry's keywords in the character card's Creator's Notes.",
  ),
});

/** Every key that gets a help icon, in the order the editor shows them. */
export const FIELD_HELP_KEYS = Object.freeze(Object.keys(FIELD_HELP));

/** The help entry for a field, or `null` for a field with none. */
export const getFieldHelp = (key) =>
  Object.prototype.hasOwnProperty.call(FIELD_HELP, key) ? FIELD_HELP[key] : null;

/** The accessible name of a field's ? icon, e.g. "Scan Depth help". */
export const formatHelpIconName = (label) => `${label} help`;
