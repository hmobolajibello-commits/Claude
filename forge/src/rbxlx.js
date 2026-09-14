import { createHash } from 'node:crypto';

// Serializes an instance tree into a Roblox XML place file (.rbxlx).
//
// Roblox's XML format is a tree of <Item class="..." referent="..."> nodes, each
// with a <Properties> block whose children are typed elements. The property
// element name is the *serialized* type and its `name` attribute is the
// serialized property name -- which is not always the Luau property name
// (BasePart.Size serializes as `<Vector3 name="size">`, Part.Shape as
// `<token name="shape">`). PROPERTY_TYPES below maps our names onto both.

export const MATERIALS = {
  Plastic: 256,
  SmoothPlastic: 272,
  Neon: 288,
  Wood: 512,
  WoodPlanks: 528,
  Marble: 784,
  Slate: 800,
  Concrete: 816,
  Granite: 832,
  Brick: 848,
  Pebble: 864,
  Cobblestone: 880,
  Rust: 896,
  DiamondPlate: 1040,
  Foil: 1056,
  Metal: 1088,
  CorrodedMetal: 1136,
  Grass: 1280,
  Sand: 1296,
  Fabric: 1312,
  Ice: 1536,
  Glass: 1568,
  ForceField: 1584,
};

export const SHAPES = { Ball: 0, Block: 1, Cylinder: 2, Wedge: 3, CornerWedge: 4 };
export const LIGHTING_TECHNOLOGY = { Voxel: 1, Compatibility: 2, ShadowMap: 3, Future: 4 };
export const SURFACES = { Smooth: 0, Glue: 1, Weld: 2, Studs: 3, Inlet: 4, Universal: 5, SmoothNoOutlines: 6 };

// name -> [serializedType, serializedName]
const PROPERTY_TYPES = {
  Name: ['string', 'Name'],
  Source: ['ProtectedString', 'Source'],
  Size: ['Vector3', 'size'],
  CFrame: ['CoordinateFrame', 'CFrame'],
  Color: ['Color3uint8', 'Color3uint8'],
  Material: ['token', 'Material'],
  Shape: ['token', 'shape'],
  Anchored: ['bool', 'Anchored'],
  CanCollide: ['bool', 'CanCollide'],
  CanTouch: ['bool', 'CanTouch'],
  Locked: ['bool', 'Locked'],
  Massless: ['bool', 'Massless'],
  Transparency: ['float', 'Transparency'],
  Reflectance: ['float', 'Reflectance'],
  TopSurface: ['token', 'TopSurface'],
  BottomSurface: ['token', 'BottomSurface'],
  Neutral: ['bool', 'Neutral'],
  Duration: ['int', 'Duration'],
  Enabled: ['bool', 'Enabled'],
  AllowTeamChangeOnTouch: ['bool', 'AllowTeamChangeOnTouch'],
  Brightness: ['float', 'Brightness'],
  Ambient: ['Color3', 'Ambient'],
  OutdoorAmbient: ['Color3', 'OutdoorAmbient'],
  ColorShift_Top: ['Color3', 'ColorShift_Top'],
  TimeOfDay: ['string', 'TimeOfDay'],
  GeographicLatitude: ['float', 'GeographicLatitude'],
  GlobalShadows: ['bool', 'GlobalShadows'],
  Technology: ['token', 'Technology'],
  EnvironmentDiffuseScale: ['float', 'EnvironmentDiffuseScale'],
  EnvironmentSpecularScale: ['float', 'EnvironmentSpecularScale'],
  Gravity: ['float', 'Gravity'],
  ExplicitAutoJoints: ['bool', 'ExplicitAutoJoints'],
  RespawnTime: ['float', 'RespawnTime'],
  CharacterWalkSpeed: ['float', 'CharacterWalkSpeed'],
  CharacterJumpPower: ['float', 'CharacterJumpPower'],
  LoadCharacterAppearance: ['bool', 'LoadCharacterAppearance'],
  Disabled: ['bool', 'Disabled'],
  ResetOnSpawn: ['bool', 'ResetOnSpawn'],
  Value: ['string', 'Value'],
};

// Roblox's XML parser rejects raw control bytes; tab, LF and CR are legal.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]', 'g');

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(CONTROL_CHARS, '');
}

function num(value) {
  if (!Number.isFinite(value)) return '0';
  // Trim float noise without losing precision that matters at stud scale.
  return String(Math.round(value * 1e6) / 1e6);
}

// '#rrggbb' | [r,g,b] 0-255 | [r,g,b] 0-1 -> {r,g,b} in 0-255
export function parseColor(value) {
  const fallback = { r: 163, g: 162, b: 165 };
  if (value == null) return fallback;
  if (typeof value === 'string') {
    const hex = value.replace('#', '').trim();
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const n = parseInt(full, 16);
    if (!Number.isFinite(n) || full.length !== 6) return fallback;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  if (Array.isArray(value)) {
    const unit = value.every((c) => c >= 0 && c <= 1) && value.some((c) => c > 0 && c < 1);
    const scale = unit ? 255 : 1;
    const clamp = (c) => Math.max(0, Math.min(255, Math.round((c ?? 0) * scale)));
    return { r: clamp(value[0]), g: clamp(value[1]), b: clamp(value[2]) };
  }
  return fallback;
}

// Euler angles in degrees (X, then Y, then Z -- matching CFrame.Angles)
// -> the 9 rotation components Roblox serializes.
export function rotationMatrix([rx = 0, ry = 0, rz = 0] = []) {
  const d = Math.PI / 180;
  const [sx, cx] = [Math.sin(rx * d), Math.cos(rx * d)];
  const [sy, cy] = [Math.sin(ry * d), Math.cos(ry * d)];
  const [sz, cz] = [Math.sin(rz * d), Math.cos(rz * d)];
  return [
    cy * cz, cz * sx * sy - cx * sz, cx * cz * sy + sx * sz,
    cy * sz, cx * cz + sx * sy * sz, -cz * sx + cx * sy * sz,
    -sy, cy * sx, cx * cy,
  ];
}

function serializeProperty(name, value, indent) {
  const mapped = PROPERTY_TYPES[name];
  if (!mapped) throw new Error(`rbxlx: unknown property "${name}" (add it to PROPERTY_TYPES)`);
  const [type, serializedName] = mapped;
  const pad = '\t'.repeat(indent);
  const inner = '\t'.repeat(indent + 1);
  const open = `${pad}<${type} name="${serializedName}">`;

  switch (type) {
    case 'string':
    case 'ProtectedString':
      return `${open}${escapeXml(value)}</${type}>`;
    case 'bool':
      return `${open}${value ? 'true' : 'false'}</bool>`;
    case 'int':
      return `${open}${Math.round(value)}</int>`;
    case 'float':
      return `${open}${num(value)}</float>`;
    case 'token':
      return `${open}${Math.round(Number(value))}</token>`;
    case 'Vector3': {
      const [x = 0, y = 0, z = 0] = value;
      return [open, `${inner}<X>${num(x)}</X>`, `${inner}<Y>${num(y)}</Y>`, `${inner}<Z>${num(z)}</Z>`, `${pad}</Vector3>`].join('\n');
    }
    case 'Color3': {
      const { r, g, b } = parseColor(value);
      return [open, `${inner}<R>${num(r / 255)}</R>`, `${inner}<G>${num(g / 255)}</G>`, `${inner}<B>${num(b / 255)}</B>`, `${pad}</Color3>`].join('\n');
    }
    case 'Color3uint8': {
      const { r, g, b } = parseColor(value);
      // 0xFF alpha in the high byte, then r, g, b -- as an unsigned 32-bit int.
      const packed = (0xff000000 | (r << 16) | (g << 8) | b) >>> 0;
      return `${open}${packed}</Color3uint8>`;
    }
    case 'CoordinateFrame': {
      const { position = [0, 0, 0], rotation = [0, 0, 0] } = value;
      const [x = 0, y = 0, z = 0] = position;
      const rows = rotationMatrix(rotation).map((component, i) => {
        const tag = `R${Math.floor(i / 3)}${i % 3}`;
        return `${inner}<${tag}>${num(component)}</${tag}>`;
      });
      return [open, `${inner}<X>${num(x)}</X>`, `${inner}<Y>${num(y)}</Y>`, `${inner}<Z>${num(z)}</Z>`, ...rows, `${pad}</CoordinateFrame>`].join('\n');
    }
    default:
      throw new Error(`rbxlx: no serializer for type "${type}"`);
  }
}

/**
 * Roblox writes every referent as "RBX" followed by a UUIDv4 with the dashes
 * removed, uppercased. Deriving it from the item's index instead of a random
 * UUID keeps the same project building byte-identical every time.
 */
function referentFor(index) {
  const digest = createHash('md5').update(`forge-referent-${index}`).digest('hex');
  return `RBX${digest.toUpperCase()}`;
}

/** A node in the place tree. */
export function instance(className, properties = {}, children = []) {
  return { className, properties, children };
}

/**
 * Serialize root-level services into a complete .rbxlx document.
 * @param {Array} roots instance() nodes, normally services (Workspace, Lighting, ...)
 */
export function serializePlace(roots) {
  let referent = 0;
  // Matched against Roblox's own place file (Roblox/rbx-test-files,
  // places/baseplate-413): no XML declaration, the two legacy <External>
  // elements, and no <Meta> -- the format spec is explicit that <Meta> appears
  // only in model files, and a place carries ExplicitAutoJoints as a Workspace
  // property instead.
  const lines = [
    '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">',
    '\t<External>null</External>',
    '\t<External>nil</External>',
  ];

  const walk = (node, depth) => {
    const pad = '\t'.repeat(depth);
    lines.push(`${pad}<Item class="${node.className}" referent="${referentFor(referent++)}">`);
    // Every <Item> in a Roblox-written place carries a Name, and none has an
    // empty <Properties> block. Default the Name to the class name (which is
    // what a service's Name actually is) so that invariant always holds.
    const declared = Object.entries(node.properties ?? {}).filter(([, v]) => v !== undefined && v !== null);
    const props = declared.some(([name]) => name === 'Name')
      ? declared
      : [['Name', node.className], ...declared];

    lines.push(`${pad}\t<Properties>`);
    for (const [name, value] of props) lines.push(serializeProperty(name, value, depth + 2));
    lines.push(`${pad}\t</Properties>`);
    for (const child of node.children ?? []) walk(child, depth + 1);
    lines.push(`${pad}</Item>`);
  };

  for (const root of roots) walk(root, 1);
  lines.push('</roblox>', '');
  return lines.join('\n');
}
