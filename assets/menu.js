// A copy of the LxYHook menu (Starlight V2, default "Starlight" theme), built from the live window:
// 930x560, 210px sidebar, 40px topbar, two 345px columns, 36px toggle rows, 50px slider rows,
// 72px label + dropdown rows, 20px checkboxes. The labels on every page are the script's own.

const ICON = {
  home: '<path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  aim: '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.5"/>',
  silent: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M17.5 6.5 21 3M19 3h2v2"/>',
  rage: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  fire: '<path d="M12 3s5 4.5 5 9.5A5 5 0 0 1 7 12.5C7 9 9.5 8 9.5 8S10 10.5 12 11c0-4 0-8 0-8z"/>',
  weapon: '<path d="M3 13h13l2-3h3v3l-2 2h-6l-2 4H8l1-4H3z"/>',
  hit: '<path d="M5 5l4 4M19 5l-4 4M5 19l4-4M19 19l-4-4"/><circle cx="12" cy="12" r="1.5"/>',
  esp: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="12" cy="10" r="2.5"/><path d="M8 17c.8-2 2.2-3 4-3s3.2 1 4 3"/>',
  cross: '<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>',
  gun: '<path d="M2 10h15l3-2h2v4l-3 1H9l-1 5H5l1-5H2z"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  move: '<circle cx="14" cy="4.5" r="2"/><path d="M8 21l3-7 3 2v5M7 11l3-3h4l2 4 3 1M11 14l-1-4"/>',
  rec: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/>',
  char: '<circle cx="12" cy="7" r="4"/><path d="M4 21c1-4.5 4-7 8-7s7 2.5 8 7"/>',
  id: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 16.5c.7-1.6 2-2.5 3.5-2.5s2.8.9 3.5 2.5M15 10h3M15 13h3"/>',
  auto: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
  loadout: '<rect x="3" y="4" width="7" height="7" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  detect: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  post: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M12 8h8M12 12h8M12 16h7"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.6-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 17.5 18z"/><path d="M9 21l1-2M13 21l1-2"/>',
  presets: '<path d="M5 4h14v16l-7-4-7 4z"/>',
  overview: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  skins: '<path d="M12 2l3 6 6 1-4.5 4.5L17.5 20 12 17l-5.5 3 1-6.5L3 9l6-1z"/>',
  wraps: '<path d="M4 20 20 4M4 14 14 4M10 20 20 10M4 8l4-4M16 20l4-4"/>',
  charms: '<circle cx="12" cy="15" r="5"/><path d="M12 10V3M9 3h6"/>',
  finish: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  profiles: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  theme: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.3" fill="currentColor"/><circle cx="12" cy="7.5" r="1.3" fill="currentColor"/><circle cx="16" cy="10" r="1.3" fill="currentColor"/><path d="M12 21a3 3 0 0 1 0-6h2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  chevron: '<path d="M7 10l5 5 5-5"/>',
};
const svg = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ''}</svg>`;

// the sidebar, in the order the live window shows it
export const SIDEBAR = [
  ['Welcome', [['Dashboard', 'home']]],
  ['Combat', [['Aimbot', 'aim'], ['Silent Aim', 'silent'], ['Ragebot', 'rage'], ['Fire Assist', 'fire'], ['Weapon Handling', 'weapon'], ['Hit Feedback', 'hit']]],
  ['Visuals', [['Player ESP', 'esp'], ['Crosshair', 'cross'], ['Weapon Visuals', 'gun'], ['Camera & Screen', 'camera'], ['Sound ESP', 'sound']]],
  ['Player', [['Movement', 'move'], ['Movement Recorder', 'rec'], ['Character', 'char'], ['Identity Spoofing', 'id']]],
  ['Automation', [['Match Flow', 'auto'], ['Auto Loadout', 'loadout'], ['In-Match Automation', 'auto'], ['Detection', 'detect'], ['Rivals Helper', 'detect']]],
  ['World', [['Lighting', 'sun'], ['Post Processing', 'post'], ['Sky & Weather', 'cloud']]],
  ['Cosmetics', [['Presets', 'presets'], ['Overview', 'overview'], ['Skins', 'skins'], ['Wraps', 'wraps'], ['Charms', 'charms'], ['Finishers', 'finish']]],
  ['Settings', [['General', 'gear'], ['Config Profiles', 'profiles'], ['Theme', 'theme']]],
];

const PIN = 'Hold a weapon, then click the pin next to a setting to give that weapon its own value.';
const MODES = ['Always', 'Toggle', 'Hold'];
// element shorthand
// t: toggle  [label, key, default, {bind, color}]      s: slider [label, key, value, min, max, {dec, suffix}]
// d: dropdown [label, value, key, options]            l: label [text, {warn}]
// b: button [label, primary]                          i: input [label, placeholder]
const t = (label, key, on = false, o = {}) => ({ k: 't', label, key, on, ...o });
const s = (label, key, value, min, max, o = {}) => ({ k: 's', label, key, value, min, max, ...o });
const d = (label, value, key = null, options = null) => ({ k: 'd', label, value, key, options });
const l = (text, o = {}) => ({ k: 'l', text, ...o });
const b = (label, primary = false) => ({ k: 'b', label, primary });
const i = (label, placeholder) => ({ k: 'i', label, placeholder });
const gb = (title, col, items) => ({ title, col, items });

const targeting = () => gb('Targeting', 1, [
  d('Target Filters', 'Visible, NotDeflecting, NotShielded, Vulnerable, Within FOV'),
  d('Aim Point', 'Closest Point'),
  s('Surface Reduction (%)', null, 81.38, 0, 100, { dec: 2 }),
  t('Preserve Depth', null, false),
  d('Hitbox Selection', 'Weighted Random', null, ['Closest To Crosshair', 'Random', 'Weighted Random']),
  s('Head %', null, 76, 0, 100),
  d('Ground Allowed Hitboxes', 'HitboxBody, HitboxHead'),
  d('Air Allowed Hitboxes', 'HitboxBody, HitboxHead'),
]);
const fov = () => gb('Targeting FOV', 2, [
  t('Show Targeting Circle', 'circle', true, { color: '#ffffff' }),
  t('Animated', null, false),
  t('Follow Target', null, false),
  t('Follow Muzzle', null, false),
  t('Filled', null, false, { color: '#e6bafb' }),
  s('Radius (px)', 'radius', 120, 1, 600),
  s('Thickness', null, 1, 1, 25),
]);

export const PAGES = {
  'Aimbot': [
    gb('Activation', 1, [
      l(PIN),
      t('Enable Aimbot', 'aimbot', false, { bind: 'LeftControl' }),
      d('Enable Aimbot Mode', 'Always', null, MODES),
      d('Activation Rules', 'Not Reloading'),
      s('Reaction Delay (s)', null, 0, 0, 2, { dec: 2 }),
      s('Switch Delay (s)', null, 0, 0, 2, { dec: 2 }),
      d('Priority', 'Closest To Crosshair', null, ['Closest To Crosshair', 'Closest Distance', 'Lowest Health']),
      d('Aim Mode', 'Linear', null, ['Lock', 'Linear', 'AI', 'Spring']),
      s('Linear Speed', 'speed', 0.35, 0.01, 1, { dec: 2 }),
      s('Smoothing (%)', 'smooth', 0, 0, 100),
      d('Curve Preset', 'Ease Out', 'curve', ['Constant', 'Linear', 'Ease In', 'Ease Out', 'S-Curve']),
      t('Attack Monsters', null, true),
    ]),
    targeting(),
    gb('Target Lock', 2, [t('Enable Target Lock', null, false, { bind: 'Y' })]),
    fov(),
  ],
  'Silent Aim': [
    gb('Activation', 1, [
      l(PIN),
      t('Enable Silent Aim', 'silent', true, { bind: 'Always' }),
      d('Enable Silent Aim Mode', 'Always', null, MODES),
      d('Activation Rules', 'Not Reloading'),
      d('Priority', 'Closest To Crosshair', null, ['Closest To Crosshair', 'Closest Distance', 'Lowest Health']),
      s('Switch Delay (s)', null, 0, 0, 2, { dec: 2 }),
      t('Attack Monsters', null, true),
    ]),
    targeting(),
    fov(),
  ],
  'Ragebot': [
    gb('Activation', 1, [
      t('Enable Ragebot', null, false, { bind: 'Always' }),
      d('Ragebot Style', 'KH', null, ['KH', 'UE', 'k8x', 'Careful', 'FW UE trash kh']),
      t('Round Start Delay', null, false),
      d('Target Order', 'Hackers first', null, ['Off', 'Hackers first', 'Legit first']),
      t('Evade When Target Hacking', null, false),
      b('Clear Hacker Tags'),
    ]),
    gb('KH Settings', 1, [
      t('Detect Knife', null, true),
      s('Stability', null, 0.75, 0, 1.5, { dec: 3 }),
      s('Shoot Frames', null, 2, 1, 5),
      t('Custom Attack Height', null, false),
      s('Attack Height', null, 0, -15, 15, { dec: 2 }),
    ]),
    gb('Weapon Strategy', 1, [t('Primary Enabled', null, true), t('Secondary Enabled', null, true), t('Melee Enabled', null, true), d('On Empty', 'Swap or Reload', null, ['Reload', 'Swap', 'Swap or Reload'])]),
    gb('Evasion', 2, [d('Evasion Mode', 'Projectile Breaker', null, ['Off', 'Random', 'Translocate', 'Projectile Breaker']), s('Forward Frequency', null, 6, 0, 20, { dec: 1 }), s('Upward Frequency', null, 4, 0, 20, { dec: 1 }), s('Reposition Interval (s)', null, 0.25, 0.05, 2, { dec: 2 })]),
    gb('Target HUD', 2, [t('Target HUD', null, true), t('Always Show', null, false), s('Scale (%)', null, 100, 50, 200), s('Item Scale (%)', null, 100, 50, 200)]),
  ],
  'Fire Assist': [
    gb('Triggerbot', 1, [l(PIN), t('Enable Triggerbot', null, false, { bind: 'MouseButton2' }), d('Target Filters', 'Visible, Within FOV'), s('Release Delay (s)', null, 0.05, 0, 2, { dec: 2 }), s('Activation Chance (%)', null, 100, 0, 100)]),
    gb('Flickbot', 2, [t('Enable Flickbot', null, false, { bind: 'E' }), t('Shoot', null, true), s('Shot Delay (ms)', null, 20, 0, 250), s('Cooldown (ms)', null, 400, 0, 2000), s('Flick Duration (ms)', null, 90, 30, 400), b('Open Aimbot Targeting')]),
  ],
  'Weapon Handling': [
    gb('Aim & Fire', 1, [t('Remove Spread', null, true), t('Automatic Fire', null, true)]),
    gb('Cooldowns', 1, [s('Cooldown (ms)', null, 0, 0, 2000)]),
    gb('Melee', 2, [t('Always Backstab', null, false), t('Counter Stab', null, true), t('Extend Melee Range', null, false), s('Range', null, 8, 0, 20)]),
    gb('Grenades', 2, [t('Fuse Override', null, false), t('Remove Fuse', null, false), d('Explode On', 'Impact')]),
  ],
  'Hit Feedback': [
    gb('Hit Feedback', 1, [t('Enable Hit Feedback', null, true), t('Play Hit Sound', null, true), d('Headshot Sound', 'Bell'), s('Headshot Volume', null, 2, 0.1, 10, { dec: 1 }), t('Mute Game Hit Sound', null, false), t('Enable Hit Chams', null, true), t('Enable Hit Flash', null, false), t('Hide Game Damage Numbers', null, true), t('Enable Damage Text', 'dmg', true), d('Damage Text Style', 'Phantom Forces', null, ['Phantom Forces', 'Fortnite']), t('Stack Damage Together (Fortnite)', null, false)]),
    gb('Elimination Feedback', 2, [t('Enable Elimination Feedback', null, true), t('Play Elimination Sound', null, true), d('Elimination Sound', 'Pop'), t('Enable Elimination Chams', null, true), t('Enable Elimination Flash', null, false), t('Enable Elimination Notification', null, false), t('Slashes', null, false), t('Explosion', null, true), t('Bubble', null, false), t('Clone', null, false)]),
  ],
  'Player ESP': [
    gb('Player ESP', 1, [
      t('Enable ESP', 'esp', false, { bind: 'None' }),
      d('Box Fit', 'Dynamic', null, ['Static', 'Dynamic']),
      d('Style', 'Full', null, ['Full', 'Corner']),
      t('Health Bar', 'health', false),
      d('Color Mode', 'Gradient', null, ['Solid', 'Gradient', 'Reactive']),
      t('Ammo Bar', null, false),
      t('Chams', 'chams', false, { color: '#e6bafb' }),
      d('Kind', 'Highlight', null, ['Legacy', 'Highlight']),
      t('Fill', null, true),
      t('Outline', null, true),
      t('Glow', null, false),
    ]),
    gb('Text', 2, [t('Use Display Names', null, true), d('Font', 'Proggy Clean', null, ['Proggy Clean', 'Proggy Tiny', 'Minecraftia']), s('Font Size', null, 13, 8, 32), d('Text Case', 'lowercase', null, ['Standard', 'UPPERCASE', 'lowercase']), d('Text Surround', 'None', null, ['None', '[]', '()', '<>', '{}']), t('Scale With Distance', null, false), s('Reference Distance', null, 100, 10, 300)]),
    gb('Division HUD', 2, [t('Division HUD', null, false), t('Ammo', null, true), t('Health', null, true), t('Shield', null, true)]),
  ],
  'Sound ESP': [
    gb('Sound ESP', 1, [t('Enable Sound ESP', 'sound', false), d('Sound Source', 'Footsteps, Gunshots, Reloads'), s('Range', null, 160, 10, 400), d('Style', 'Rings', null, ['Rings', 'Dots'])]),
    gb('Activation & Filtering', 2, [t('Enemies Only', null, true), t('Hide Own Sounds', null, true), s('Thickness', null, 1, 1, 10)]),
  ],
  'Crosshair': [
    gb('Crosshair', 1, [t('Enable Crosshair', null, true), d('Crosshair Style', 'Lines', null, ['Lines', 'Image']), s('Line Length', null, 7, 1, 100), s('Thickness', null, 1, 1, 10), t('Crosshair Outline', null, true), t('Rotate Crosshair', null, false), s('Animation Speed (deg/s)', null, 90, 0, 360), t('Crosshair Spread', null, false)]),
    gb('Text', 2, [t('Enable Crosshair Text', null, false), d('Crosshair Text Font', 'Proggy Clean'), t('Crosshair Text Outline', null, true)]),
    gb('Motion & Effects', 2, [t('Follow Target', null, false), d('Follow Target Mode', 'Head'), s('Follow Speed', null, 12, 0, 50)]),
  ],
  'Weapon Visuals': [
    gb('Viewmodel Position', 1, [t('Enable Viewmodel Position', null, false), s('X Offset', null, 0, -5, 5, { dec: 2 }), s('Y Offset', null, 0, -5, 5, { dec: 2 })]),
    gb('Motion & Animation', 1, [t('Hide Shoot Animation', null, false), t('Hide Sprint Animation', null, false), t('Hide Equip Animation', null, false), t('Hide Reload Animation', null, false), t('Remove Weapon Motion', null, true), t('Remove Camera Shake', null, true), t('Remove Camera Sway', null, true)]),
    gb('Bullet Tracers', 2, [t('Enable Bullet Tracers', 'tracers', true, { color: '#a1a9e1' }), d('Tracer Style', 'Beam'), t('Expand Tracers', null, false)]),
    gb('Suppressions', 2, [t('Hide Muzzle Flash', null, false), t('Hide Game Tracers', null, true)]),
  ],
  'Camera & Screen': [
    gb('Camera FOV', 1, [t('Enable Camera FOV', null, true), s('Field of View', null, 90, 30, 120)]),
    gb('Gameplay Overlays', 1, [t('Hide Flashbang Effect', null, true), t('Hide Burn Effect', null, true), t('Hide ADS Vignette', null, true), t('Hide Scope Overlay', null, false), t('Hide Scope Reticle', null, false), t('Hide Hitmarker', null, false)]),
    gb('Stretched Resolution', 2, [t('Enable Stretched Resolution', null, false), s('X Scale', null, 1, 0.5, 2, { dec: 2 }), s('Y Scale', null, 0.8, 0.5, 2, { dec: 2 })]),
    gb('Third Person', 2, [t('Enable Third Person', null, false, { bind: 'V' }), t('Ray Check', null, true), s('Y Offset', null, 1.5, -5, 10, { dec: 1 })]),
  ],
  'Movement': [
    gb('Ground', 1, [t('Speed', null, false, { bind: 'None' }), s('Speed', null, 24, 16, 60)]),
    gb('Air', 2, [t('Infinite Double Jumps', 'infjump', false), s('Force', null, 50, 0, 300), s('Upward Velocity', null, 40, 0, 200)]),
  ],
  'Movement Recorder': [
    gb('Recorder', 1, [t('Enable Movement Recorder', 'recorder', false), t('Hide Recorder UI', null, false), t('Hide Recorder Notifications', null, false)]),
    gb('Record / Replay', 1, [b('Record', true), b('Replay'), d('Recording', 'parkour_02')]),
    gb('Playback Alignment', 2, [s('Look Align Speed', null, 8, 0, 20, { dec: 1 }), s('Look Smoothness', null, 0.35, 0, 1, { dec: 2 }), s('Align Snap Distance', null, 3, 0, 10, { dec: 1 })]),
    gb('Save Recording', 2, [i('Name', 'parkour_03'), b('Save Recording')]),
  ],
  'Character': [
    gb('Animation Player', 1, [t('Enable Animation Player', null, false), d('Animation', 'Wave')]),
    gb('Character Appearance', 2, [t('Enable Character Chams', null, false, { color: '#8ac9f2' }), d('Character Chams Material', 'ForceField'), t('Strip Character Chams Textures', null, false)]),
  ],
  'Identity Spoofing': [
    gb('Device Spoof', 1, [t('Enable Device Spoof', null, false), d('Presented Platform', 'Console', null, ['PC', 'Mobile', 'Console', 'VR'])]),
    gb('Name', 2, [t('Spoof Display Name', null, false), i('Display Name', 'definitely not cheating')]),
  ],
  'Match Flow': [
    gb('Auto Queue', 1, [t('Enabled', 'queue', false), d('Queue', '1v1')]),
    gb('Auto Respawn', 1, [t('Enabled', null, true)]),
    gb('Auto Map Vote', 2, [t('Enabled', null, true), d('Map', 'Random')]),
    gb('Auto Weapon Ban', 2, [t('Enabled', null, true), d('First Ban Choices', 'Sniper'), d('Second Ban Choices', 'RPG')]),
  ],
  'Auto Loadout': [
    gb('Setup', 1, [t('Use Map-Specific Loadouts', null, true), t('Use Fallback Loadouts', null, true), d('Map', 'Crossroads')]),
    gb('Slot Editor', 2, [d('Loadout Priority (1 highest)', 'Primary, Secondary, Melee'), b('Save Loadout', true)]),
  ],
  'In-Match Automation': [
    gb('Auto Pickup', 1, [t('Enabled', null, true)]),
    gb('Anti Katana', 1, [t('Enabled', null, false)]),
    gb('Subspace Tripmines', 2, [t('Enabled', null, false)]),
  ],
  'Detection': [
    gb('Hacker Detector', 1, [t('Enabled', 'hacker', false), t('Notify', null, true), b('Test Popup')]),
    gb('Moderator Detector', 2, [t('Enabled', 'mod', false), d('Moderator Responses', 'Notify, ToLobby', null, ['Notify', 'Kick', 'ToLobby']), d('Mod Friends', 'Notify', null, ['Notify', 'Kick', 'ToLobby'])]),
  ],
  'Rivals Helper': [
    gb('Overlays', 1, [t('Leaderboard (ELO / Level / Win Streak)', null, true), t('Info HUD (FPS / Ping / Server)', null, true), i('Hide From Leaderboard', 'username'), b('Reset Panel Positions')]),
    gb('Alerts', 2, [t('Watchlist Join Alerts', null, true), i('Watchlist', 'name, name'), t('Streak Hunter Alerts', null, true), s('Streak Threshold', null, 10, 5, 1000)]),
  ],
  'Lighting': [
    gb('Lighting Override', 1, [t('Enable Lighting Override', null, true)]),
    gb('Time & Exposure', 1, [s('Clock Time', 'clock', 22, 0, 24, { dec: 2 }), s('Geographic Latitude', null, 41.7, 0, 90, { dec: 1 }), s('Brightness', null, 2, 0, 10, { dec: 1 }), s('Exposure Compensation', null, 0.2, -3, 3, { dec: 1 })]),
    gb('Shadows & Quality', 2, [t('Disable Global Shadows', null, false), s('Shadow Softness', null, 0.2, 0, 1, { dec: 2 }), t('Prioritize Lighting Quality', null, true)]),
    gb('Fog & Atmosphere', 2, [t('Fog', null, true), t('Atmosphere', null, true)]),
  ],
  'Post Processing': [
    gb('Tone & Color', 1, [t('Color Correction', null, true), t('Color Grading', null, false)]),
    gb('Focus & Motion', 1, [t('Depth of Field', null, false), t('Motion Blur', null, false)]),
    gb('Light Effects', 2, [t('Bloom', null, true), t('Sun Rays', null, true)]),
  ],
  'Sky & Weather': [
    gb('Skybox', 1, [t('Enable Skybox', null, true), d('Skybox', 'Night Sky'), b('Manage Skyboxes')]),
    gb('Ambient Sound', 1, [t('Enable Ambient Sound', null, true), d('Sound', 'Soft Rain', null, ['Soft Rain', 'Light Rain'])]),
    gb('Weather', 2, [t('Enable Weather', 'weather', false)]),
    gb('Lightning', 2, [t('Enable Lightning', 'lightning', false), t('Sparks', 'sparks', true), t('Sound', null, true), s('Delay', null, 4, 1, 30)]),
  ],
  'Presets': [
    gb('Presets', 1, [d('Preset', 'main'), b('Load Preset', true), b('Delete Preset')]),
    gb('Automation', 2, [t('Auto Load Cosmetic Preset', null, true), t('Auto Save Cosmetic Preset', null, false)]),
  ],
  'Overview': [
    gb('Cosmetic Runtime', 1, [t('Enable Cosmetic Changes', 'cosmetics', false), l('Cosmetic features are paused until cosmetic changes are enabled.', { warn: true, when: 'cosmetics' }), t('Use Custom Loadout', 'loadout', false)]),
    gb('Unlock All', 1, [t('Unlock All Cosmetics', 'unlock', false), d('Cosmetic Rarities to Unlock', 'All')]),
    gb('Community', 2, [t('Share Skins', null, false), t('Show Active Cosmetics', null, true)]),
  ],
  'Skins': [gb('Skin Catalog', 1, [d('Weapon', 'Sniper'), d('Skin', 'Default', 'skin', ['Default', 'Keyper'])]), gb('Apply To', 2, [d('Apply To', 'Equipped Weapon')])],
  'Wraps': [gb('Wrap Catalog', 1, [d('Weapon', 'Sniper'), d('Wrap', 'None', 'wrap', ['None', 'Hazard', 'Checker', 'Static', 'Waves', 'Digital', 'Aurora']), t('Inverted Wrap', null, false)]), gb('Apply To', 2, [d('Apply To', 'Equipped Weapon')])],
  'Charms': [gb('Charm Catalog', 1, [d('Weapon', 'Assault Rifle'), d('Charm', 'Snowflake')]), gb('Rank Charm Override', 2, [t('Enabled', null, false), d('Season', 'All'), d('Rank', 'Archnemesis')])],
  'Finishers': [gb('Finisher Catalog', 1, [d('Weapon', 'Assault Rifle'), d('Finisher', 'Default')])],
  'General': [
    gb('Menu', 1, [l('Menu Keybind', { bind: 'RightShift' }), t('Show Keybinds', null, true), t('Show Watermark', null, true), t('Hide Floating Menu Button', null, false), b('Edit On-screen Keybinds')]),
    gb('Startup', 2, [t('Auto Save', null, true), t('Auto Load', null, true), t('Re-run After Teleport', null, true), t('Silent Load', null, false)]),
    gb('Notifications', 2, [t('Enable Notifications', null, true)]),
  ],
  'Config Profiles': [gb('Whole-Menu Profiles', 1, [d('Profile to Auto Save', 'main'), d('Profile to Auto Load', 'main'), b('Save Profile', true)]), gb('Transfer', 2, [b('Export'), b('Import')])],
  'Theme': [gb('Theme Colors', 1, [d('UI Style', 'Starlight'), d('Low-Load Mode', 'Off')]), gb('Manage', 2, [t('Acrylic', null, true), i('New Theme Name', 'Name'), b('Create New Theme'), d('Themes List', 'Starlight'), b('Apply Theme', true)])],
};

const fmt = (v, dec) => {
  if (!dec) return String(Math.round(v));
  const r = Number(v.toFixed(dec));
  return String(r);
};

export function createMenu(root, state) {
  const userSet = new Set();
  const listeners = new Set();
  const pageCache = new Map();
  let current = null;

  root.innerHTML = `
    <div class="sl-win" role="group" aria-label="LxYHook menu (a working copy of the real one)">
      <aside class="sl-side">
        <div class="sl-brand"><img class="sl-logo" src="assets/logo.png" alt="" width="40" height="40"><div class="sl-title">LxYHook | Rivals | Premium Build</div></div>
        <nav class="sl-nav" aria-label="menu tabs"></nav>
        <div class="sl-player"><span class="sl-line"></span><span class="sl-avatar" aria-hidden="true"></span><span class="sl-pname">you<small>your_username</small></span></div>
      </aside>
      <section class="sl-content">
        <header class="sl-top"><span class="sl-sub">Rivals</span><span class="sl-tools">${svg('search', 'sl-search')}${svg('bell', 'sl-bell')}<i></i><i></i><i></i></span></header>
        <div class="sl-main"></div>
      </section>
    </div>`;
  const nav = root.querySelector('.sl-nav');
  const main = root.querySelector('.sl-main');
  const sub = root.querySelector('.sl-sub');

  for (const [section, tabs] of SIDEBAR) {
    const wrap = document.createElement('div');
    wrap.className = 'sl-section';
    wrap.innerHTML = `<p class="sl-sec">${section}</p>`;
    for (const [name, icon] of tabs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sl-tab';
      btn.dataset.page = name;
      btn.innerHTML = `${svg(icon, 'sl-ico')}<span>${name}</span>`;
      btn.addEventListener('click', () => { show(name); emit('page', name); });
      wrap.appendChild(btn);
    }
    nav.appendChild(wrap);
  }

  const emit = (type, a, b2) => listeners.forEach((fn) => fn(type, a, b2));

  function rowToggle(e) {
    const on = e.key ? !!state[e.key] : e.on;
    const extras = `${e.color ? `<span class="sl-swatch" style="--c:${e.color}"></span>` : ''}${e.bind ? `<span class="sl-bind">${e.bind}</span>` : ''}`;
    return `<div class="sl-row sl-row--toggle"><button type="button" class="sl-hit" role="switch" aria-checked="${on}" ${e.key ? `data-key="${e.key}"` : ''}><span class="sl-label">${e.label}</span></button><span class="sl-right">${extras}<span class="sl-check" aria-hidden="true"></span></span></div>`;
  }
  function rowSlider(e) {
    const v = e.key && typeof state[e.key] === 'number' ? state[e.key] : e.value;
    const p = (v - e.min) / (e.max - e.min);
    return `<div class="sl-row sl-row--slider" ${e.key ? `data-key="${e.key}"` : ''} data-min="${e.min}" data-max="${e.max}" data-dec="${e.dec || 0}"><span class="sl-label">${e.label}</span><span class="sl-val"><b>${fmt(v, e.dec)}</b><small>/${e.max}${e.suffix || ''}</small></span><span class="sl-track" role="slider" tabindex="0" aria-label="${e.label}" aria-valuemin="${e.min}" aria-valuemax="${e.max}" aria-valuenow="${v}"><span class="sl-fill" style="--p:${p}"><i></i></span></span></div>`;
  }
  function rowDropdown(e) {
    const v = e.key && typeof state[e.key] === 'string' ? state[e.key] : e.value;
    return `<div class="sl-row sl-row--dd"><span class="sl-label">${e.label}</span><button type="button" class="sl-dd" ${e.key ? `data-key="${e.key}"` : ''} ${e.options ? `data-options="${e.options.join('|')}"` : ''} aria-haspopup="listbox"><span>${v}</span>${svg('chevron', 'sl-chev')}</button></div>`;
  }
  function rowLabel(e) {
    if (e.bind) return `<div class="sl-row sl-row--toggle"><span class="sl-label">${e.text}</span><span class="sl-right"><span class="sl-bind">${e.bind}</span></span></div>`;
    return `<div class="sl-row sl-row--label ${e.warn ? 'is-warn' : ''}" ${e.when ? `data-when="${e.when}"` : ''}><span class="sl-label">${e.text}</span></div>`;
  }
  const rowButton = (e) => `<div class="sl-row sl-row--btn"><button type="button" class="sl-btn ${e.primary ? 'is-primary' : ''}">${e.label}</button></div>`;
  const rowInput = (e) => `<div class="sl-row sl-row--toggle"><span class="sl-label">${e.label}</span><span class="sl-right"><input class="sl-input" type="text" placeholder="${e.placeholder}" aria-label="${e.label}"></span></div>`;
  const ROW = { t: rowToggle, s: rowSlider, d: rowDropdown, l: rowLabel, b: rowButton, i: rowInput };

  function buildDashboard() {
    const el = document.createElement('div');
    el.className = 'sl-page sl-home';
    el.innerHTML = `
      <div class="sl-hero"><span class="sl-thumb" aria-hidden="true"></span><div><p class="sl-hi">Welcome, you</p><p class="sl-hi2">Jeez you should be asleep... |</p></div><p class="sl-clock js-sl-clock"></p></div>
      <div class="sl-cards">
        <div class="sl-cardcol"><div class="sl-card sl-card--s"><p class="sl-ch">Lxyhook</p><p class="sl-cs">discord invite</p></div><div class="sl-card"><p class="sl-ch">Server</p><p class="sl-cs">Currently Playing [🛡️] RIVALS</p><div class="sl-stats"><span><b>8</b>players</span><span><b>8</b>max players</span><span><b>41ms</b>latency</span><span><b>copy</b>join script</span></div></div></div>
        <div class="sl-cardcol"><div class="sl-card sl-card--l"><p class="sl-ch">Changelog</p><p class="sl-cs">Build 52 · 2026-10-24<br>Starlight is the default UI, opens instantly. Auto ragebot style. Mouse keybinds.</p></div><div class="sl-card sl-card--s"><p class="sl-ch">Executor</p><p class="sl-cs">Your Executor Seems To Be Supported</p></div></div>
        <div class="sl-cardcol"><div class="sl-card sl-card--m"><p class="sl-ch">Account</p><p class="sl-cs">Coming Soon.</p></div><div class="sl-card"><p class="sl-ch">Friends</p><div class="sl-stats"><span><b>0</b>in server</span><span><b>3</b>online</span><span><b>12</b>offline</span><span><b>15</b>total</span></div></div></div>
      </div>`;
    return el;
  }

  function buildPage(name) {
    if (name === 'Dashboard') return buildDashboard();
    const groups = PAGES[name] || [gb(name, 1, [l('Nothing to show here in the preview.')])];
    const el = document.createElement('div');
    el.className = 'sl-page';
    const cols = [document.createElement('div'), document.createElement('div')];
    cols.forEach((c) => (c.className = 'sl-col'));
    for (const g of groups) {
      const box = document.createElement('div');
      box.className = 'sl-gb';
      box.innerHTML = `<p class="sl-gbt">${g.title}</p><div class="sl-gbc">${g.items.map((e) => ROW[e.k](e)).join('')}</div>`;
      cols[g.col === 2 ? 1 : 0].appendChild(box);
    }
    el.append(cols[0], cols[1]);
    wire(el);
    return el;
  }

  function setToggleDom(el, on) {
    el.setAttribute('aria-checked', String(on));
  }

  function wire(el) {
    el.querySelectorAll('.sl-row--toggle .sl-hit').forEach((btn) => {
      const row = btn.closest('.sl-row');
      const flip = () => {
        const on = btn.getAttribute('aria-checked') !== 'true';
        setToggleDom(btn, on);
        const key = btn.dataset.key;
        if (key) { state[key] = on; userSet.add(key); sync(key); emit('change', key, on); }
      };
      btn.addEventListener('click', flip);
      row.querySelector('.sl-check').addEventListener('click', () => btn.click());
    });
    el.querySelectorAll('.sl-row--slider').forEach((row) => {
      const track = row.querySelector('.sl-track');
      const min = Number(row.dataset.min), max = Number(row.dataset.max), dec = Number(row.dataset.dec);
      const key = row.dataset.key;
      const setFrom = (clientX) => {
        const r = track.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
        let v = min + p * (max - min);
        v = dec ? Number(v.toFixed(dec)) : Math.round(v);
        paintSlider(row, v);
        if (key) { state[key] = v; userSet.add(key); emit('change', key, v); }
      };
      track.addEventListener('pointerdown', (ev) => {
        track.setPointerCapture(ev.pointerId);
        setFrom(ev.clientX);
        const move = (e2) => setFrom(e2.clientX);
        const up = () => { track.removeEventListener('pointermove', move); track.removeEventListener('pointerup', up); };
        track.addEventListener('pointermove', move);
        track.addEventListener('pointerup', up);
      });
      track.addEventListener('keydown', (ev) => {
        if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
        ev.preventDefault();
        const cur = Number(track.getAttribute('aria-valuenow'));
        const step = dec ? (max - min) / 50 : Math.max(1, Math.round((max - min) / 50));
        let v = Math.min(max, Math.max(min, cur + (ev.key === 'ArrowRight' ? step : -step)));
        v = dec ? Number(v.toFixed(dec)) : Math.round(v);
        paintSlider(row, v);
        if (key) { state[key] = v; userSet.add(key); emit('change', key, v); }
      });
    });
    el.querySelectorAll('.sl-dd').forEach((dd) => {
      dd.addEventListener('click', (ev) => {
        ev.stopPropagation();
        closePopups();
        const opts = dd.dataset.options ? dd.dataset.options.split('|') : [dd.textContent.trim()];
        const pop = document.createElement('div');
        pop.className = 'sl-pop';
        pop.setAttribute('role', 'listbox');
        const curV = dd.querySelector('span').textContent;
        pop.innerHTML = opts.map((o) => `<button type="button" role="option" aria-selected="${o === curV}">${o}</button>`).join('');
        pop.addEventListener('click', (e2) => {
          const btn = e2.target.closest('button');
          if (!btn) return;
          dd.querySelector('span').textContent = btn.textContent;
          if (dd.dataset.key) { state[dd.dataset.key] = btn.textContent; userSet.add(dd.dataset.key); emit('change', dd.dataset.key, btn.textContent); }
          closePopups();
        });
        dd.parentElement.appendChild(pop);
      });
    });
    el.querySelectorAll('.sl-btn').forEach((btn) => btn.addEventListener('click', () => emit('button', btn.textContent)));
    refreshWhen(el);
  }

  function closePopups() { root.querySelectorAll('.sl-pop').forEach((p) => p.remove()); }
  document.addEventListener('click', closePopups);

  function paintSlider(row, v) {
    const min = Number(row.dataset.min), max = Number(row.dataset.max), dec = Number(row.dataset.dec);
    row.querySelector('.sl-val b').textContent = fmt(v, dec);
    row.querySelector('.sl-fill').style.setProperty('--p', String((v - min) / (max - min)));
    row.querySelector('.sl-track').setAttribute('aria-valuenow', String(v));
  }

  function refreshWhen(scope) {
    scope.querySelectorAll('[data-when]').forEach((elx) => { elx.hidden = !!state[elx.dataset.when]; });
  }

  // put a value the page logic picked into every place that shows it
  function sync(key) {
    root.querySelectorAll(`.sl-hit[data-key="${key}"]`).forEach((btn) => setToggleDom(btn, !!state[key]));
    root.querySelectorAll(`.sl-row--slider[data-key="${key}"]`).forEach((row) => paintSlider(row, state[key]));
    root.querySelectorAll(`.sl-dd[data-key="${key}"] span`).forEach((s2) => (s2.textContent = state[key]));
    refreshWhen(root);
  }

  function show(name) {
    if (current === name) return;
    current = name;
    root.querySelectorAll('.sl-tab').forEach((b2) => b2.classList.toggle('is-on', b2.dataset.page === name));
    let page = pageCache.get(name);
    if (!page) { page = buildPage(name); pageCache.set(name, page); }
    main.replaceChildren(page);
    page.classList.remove('is-in');
    void page.offsetWidth;
    page.classList.add('is-in');
    main.scrollTop = 0;
    const active = root.querySelector('.sl-tab.is-on');
    if (active) {
      const navR = nav.getBoundingClientRect(), r = active.getBoundingClientRect();
      if (r.top < navR.top || r.bottom > navR.bottom) nav.scrollTop += r.top - navR.top - navR.height / 2 + r.height / 2;
    }
    sub.innerHTML = `Rivals<b class="sl-cur">${name}</b>`;
  }

  return {
    show,
    get page() { return current; },
    // the scroll story turns things on; a switch the visitor flipped stays the way they left it
    auto(key, value) {
      if (userSet.has(key) || state[key] === value) return;
      state[key] = value;
      sync(key);
    },
    touched: (key) => userSet.has(key),
    on(fn) { listeners.add(fn); },
    tickClock() {
      const el = root.querySelector('.js-sl-clock');
      if (!el) return;
      const n = new Date();
      el.innerHTML = `${String(n.getHours()).padStart(2, '0')} : ${String(n.getMinutes()).padStart(2, '0')} : ${String(n.getSeconds()).padStart(2, '0')}<br>${String(n.getDate()).padStart(2, '0')} / ${String(n.getMonth() + 1).padStart(2, '0')} / ${n.getFullYear()}`;
    },
  };
}
