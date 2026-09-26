/**
 * tools/palettes_v2.mjs — the House of Scion twelve palettes, second edition
 * ---------------------------------------------------------------------------
 * Same structure as the live PALETTES object in skinprofile.html
 * (4 skin depths × 3 undertones; five Best singles, five Highly Acceptable
 * singles, five Best combinations, five Highly Acceptable combinations),
 * rebuilt from the classic fabric colours of tailoring and couture.
 *
 * Authoring rules, checked by tools/build_palette_study.mjs:
 *   - every combination is built only from that palette's own ten colours,
 *     so a client is never shown a pairing with a colour they were not given;
 *   - no colour sits so close to its skin reference that it blends into
 *     the complexion (CIEDE2000 floor — see the build tool);
 *   - no screen-only saturation: chroma stays inside what dyed cloth holds;
 *   - cool palettes carry no golden colours, warm palettes no icy ones;
 *     navy, charcoal, chocolate and the whites act as neutral grounds.
 *
 * Combinations name two colours from the palette: [ground/hero, partner].
 */

// Skin reference per profile — the complexion each palette is tested against.
// Depth follows the swatches used on skinprofile.html; undertone shifts the
// hue a few degrees pinker (cool) or more golden (warm).
export const SKIN_REF = {
  'fair-light':   { cool: '#EBD4CB', warm: '#EFD6BA', neutral: '#E8D5C4' },
  'medium-olive': { cool: '#C8977F', warm: '#C99A62', neutral: '#C4956A' },
  'tan':          { cool: '#9C6E5C', warm: '#A0724A', neutral: '#9B7250' },
  'dark-deep':    { cool: '#4A2C28', warm: '#53321C', neutral: '#4A2E1E' },
};

export const NEW = {
  'fair-light': {
    cool: {
      best: [
        ['#A7BFDC', 'Powder Blue'],
        ['#D8A6B3', 'Rose Quartz'],
        ['#AFA2C8', 'Heather Lilac'],
        ['#7C3656', 'Mulberry'],
        ['#34425F', 'Slate Navy'],
      ],
      acceptable: [
        ['#F1F0EC', 'Chalk White'],
        ['#BFC0C4', 'Dove Grey'],
        ['#868B94', 'Pewter'],
        ['#A38E98', 'Mauve Taupe'],
        ['#8BA79F', 'Eucalyptus'],
      ],
      bestCombos: [
        ['Slate Navy', 'Chalk White'],
        ['Powder Blue', 'Slate Navy'],
        ['Rose Quartz', 'Dove Grey'],
        ['Mulberry', 'Dove Grey'],
        ['Heather Lilac', 'Pewter'],
      ],
      haCombos: [
        ['Chalk White', 'Dove Grey'],
        ['Mauve Taupe', 'Chalk White'],
        ['Eucalyptus', 'Pewter'],
        ['Pewter', 'Powder Blue'],
        ['Mauve Taupe', 'Heather Lilac'],
      ],
    },
    warm: {
      best: [
        ['#E07E69', 'Soft Coral'],
        ['#EDAE86', 'Apricot'],
        ['#5FA69E', 'Lagoon'],
        ['#BF976A', 'Camel'],
        ['#EBD088', 'Primrose'],
      ],
      acceptable: [
        ['#FAF6EC', 'Ivory'],
        ['#3A4A6A', 'Marine Navy'],
        ['#A5774F', 'Toffee'],
        ['#A8B383', 'Pistachio'],
        ['#B4A48B', 'Warm Stone'],
      ],
      bestCombos: [
        ['Soft Coral', 'Ivory'],
        ['Camel', 'Marine Navy'],
        ['Lagoon', 'Camel'],
        ['Apricot', 'Warm Stone'],
        ['Primrose', 'Marine Navy'],
      ],
      haCombos: [
        ['Ivory', 'Camel'],
        ['Warm Stone', 'Marine Navy'],
        ['Pistachio', 'Ivory'],
        ['Toffee', 'Ivory'],
        ['Pistachio', 'Toffee'],
      ],
    },
    neutral: {
      best: [
        ['#C68F96', 'Dusty Rose'],
        ['#9CAD94', 'Sage'],
        ['#5C8A88', 'Soft Teal'],
        ['#8A5A63', 'Rosewood'],
        ['#7F98B8', 'Chambray'],
      ],
      acceptable: [
        ['#F7F6F3', 'Porcelain'],
        ['#B3AA9F', 'Greige'],
        ['#857A72', 'Mushroom'],
        ['#2E3A52', 'Ink Navy'],
        ['#A79BB0', 'Dusk Lilac'],
      ],
      bestCombos: [
        ['Dusty Rose', 'Greige'],
        ['Sage', 'Porcelain'],
        ['Soft Teal', 'Mushroom'],
        ['Rosewood', 'Porcelain'],
        ['Chambray', 'Ink Navy'],
      ],
      haCombos: [
        ['Porcelain', 'Greige'],
        ['Ink Navy', 'Greige'],
        ['Mushroom', 'Dusk Lilac'],
        ['Dusk Lilac', 'Porcelain'],
        ['Sage', 'Mushroom'],
      ],
    },
  },

  'medium-olive': {
    cool: {
      best: [
        ['#1B7A60', 'Emerald'],
        ['#2B4E8E', 'Sapphire'],
        ['#5C2E5B', 'Aubergine'],
        ['#A3325A', 'Raspberry'],
        ['#23596A', 'Petrol'],
      ],
      acceptable: [
        ['#EFEEEA', 'Soft White'],
        ['#8E929A', 'Cool Grey'],
        ['#3B3E45', 'Charcoal'],
        ['#CDAAC0', 'Orchid Mist'],
        ['#5A7A96', 'Steel Blue'],
      ],
      bestCombos: [
        ['Sapphire', 'Soft White'],
        ['Emerald', 'Charcoal'],
        ['Aubergine', 'Orchid Mist'],
        ['Raspberry', 'Cool Grey'],
        ['Petrol', 'Soft White'],
      ],
      haCombos: [
        ['Charcoal', 'Soft White'],
        ['Steel Blue', 'Cool Grey'],
        ['Orchid Mist', 'Charcoal'],
        ['Steel Blue', 'Soft White'],
        ['Cool Grey', 'Aubergine'],
      ],
    },
    warm: {
      best: [
        ['#6C6A38', 'Olive'],
        ['#B45E3E', 'Terracotta'],
        ['#9C7424', 'Antique Mustard'],
        ['#1F6D69', 'Deep Teal'],
        ['#8C4F2E', 'Cognac'],
      ],
      acceptable: [
        ['#EEE4CF', 'Ecru'],
        ['#9E946C', 'Khaki'],
        ['#4B3325', 'Chocolate'],
        ['#2F4A3A', 'Bottle Green'],
        ['#6A2A26', 'Oxblood'],
      ],
      bestCombos: [
        ['Olive', 'Ecru'],
        ['Terracotta', 'Khaki'],
        ['Deep Teal', 'Antique Mustard'],
        ['Cognac', 'Ecru'],
        ['Antique Mustard', 'Chocolate'],
      ],
      haCombos: [
        ['Khaki', 'Ecru'],
        ['Chocolate', 'Ecru'],
        ['Bottle Green', 'Khaki'],
        ['Oxblood', 'Khaki'],
        ['Olive', 'Cognac'],
      ],
    },
    neutral: {
      best: [
        ['#3E7876', 'Muted Teal'],
        ['#A66E6E', 'Rose Clay'],
        ['#2F5642', 'Forest'],
        ['#56708F', 'Denim'],
        ['#7A2E3C', 'Garnet'],
      ],
      acceptable: [
        ['#EFE9DC', 'Parchment'],
        ['#B8AFA2', 'Stone'],
        ['#7E7268', 'Taupe'],
        ['#93A08A', 'Sage'],
        ['#3E3431', 'Espresso'],
      ],
      bestCombos: [
        ['Muted Teal', 'Stone'],
        ['Rose Clay', 'Parchment'],
        ['Forest', 'Parchment'],
        ['Denim', 'Espresso'],
        ['Garnet', 'Taupe'],
      ],
      haCombos: [
        ['Stone', 'Parchment'],
        ['Taupe', 'Parchment'],
        ['Sage', 'Stone'],
        ['Espresso', 'Stone'],
        ['Sage', 'Taupe'],
      ],
    },
  },

  'tan': {
    cool: {
      best: [
        ['#224A9C', 'Cobalt'],
        ['#AE2A6E', 'Fuchsia'],
        ['#4E2B78', 'Royal Purple'],
        ['#6E1F35', 'Bordeaux'],
        ['#0F6B5C', 'Pine'],
      ],
      acceptable: [
        ['#F6F6F3', 'Optic White'],
        ['#33363C', 'Charcoal'],
        ['#C2E0D7', 'Icy Mint'],
        ['#B4B7BD', 'Silver Grey'],
        ['#1D2641', 'Midnight Navy'],
      ],
      bestCombos: [
        ['Cobalt', 'Optic White'],
        ['Fuchsia', 'Charcoal'],
        ['Royal Purple', 'Silver Grey'],
        ['Bordeaux', 'Midnight Navy'],
        ['Pine', 'Optic White'],
      ],
      haCombos: [
        ['Midnight Navy', 'Optic White'],
        ['Charcoal', 'Icy Mint'],
        ['Silver Grey', 'Midnight Navy'],
        ['Charcoal', 'Silver Grey'],
        ['Icy Mint', 'Midnight Navy'],
      ],
    },
    warm: {
      best: [
        ['#B5521F', 'Burnt Orange'],
        ['#A6362A', 'Paprika'],
        ['#D29A2E', 'Marigold'],
        ['#1F8680', 'Warm Teal'],
        ['#5E5D2F', 'Olive Drab'],
      ],
      acceptable: [
        ['#F1E6CF', 'Cream'],
        ['#452E22', 'Chocolate'],
        ['#6D4A2D', 'Tobacco'],
        ['#B5A57F', 'Khaki'],
        ['#EAC29A', 'Apricot Cream'],
      ],
      bestCombos: [
        ['Burnt Orange', 'Cream'],
        ['Paprika', 'Khaki'],
        ['Marigold', 'Chocolate'],
        ['Warm Teal', 'Cream'],
        ['Olive Drab', 'Apricot Cream'],
      ],
      haCombos: [
        ['Cream', 'Tobacco'],
        ['Khaki', 'Chocolate'],
        ['Apricot Cream', 'Tobacco'],
        ['Cream', 'Khaki'],
        ['Olive Drab', 'Tobacco'],
      ],
    },
    neutral: {
      best: [
        ['#1F5E61', 'Deep Teal'],
        ['#A4545A', 'Burnt Rose'],
        ['#6D7342', 'Moss'],
        ['#3F5E80', 'Slate Blue'],
        ['#BE8B32', 'Amber'],
      ],
      acceptable: [
        ['#F1ECE2', 'Ivory'],
        ['#A9A499', 'Stone Grey'],
        ['#6A5C53', 'Mocha'],
        ['#243150', 'Navy'],
        ['#D69A87', 'Soft Coral'],
      ],
      bestCombos: [
        ['Deep Teal', 'Ivory'],
        ['Burnt Rose', 'Stone Grey'],
        ['Moss', 'Ivory'],
        ['Slate Blue', 'Mocha'],
        ['Amber', 'Navy'],
      ],
      haCombos: [
        ['Navy', 'Ivory'],
        ['Stone Grey', 'Navy'],
        ['Mocha', 'Ivory'],
        ['Soft Coral', 'Stone Grey'],
        ['Mocha', 'Soft Coral'],
      ],
    },
  },

  'dark-deep': {
    cool: {
      best: [
        ['#2150A8', 'Cobalt'],
        ['#A8236C', 'Fuchsia'],
        ['#0E7C5A', 'Emerald'],
        ['#52308A', 'Royal Violet'],
        ['#A81C33', 'Cherry Red'],
      ],
      acceptable: [
        ['#F8F8F6', 'Optic White'],
        ['#141416', 'Jet Black'],
        ['#BFC2C7', 'Silver'],
        ['#BCD6E8', 'Ice Blue'],
        ['#D4C8E6', 'Icy Lilac'],
      ],
      bestCombos: [
        ['Cobalt', 'Optic White'],
        ['Fuchsia', 'Jet Black'],
        ['Emerald', 'Optic White'],
        ['Royal Violet', 'Silver'],
        ['Cherry Red', 'Jet Black'],
      ],
      haCombos: [
        ['Jet Black', 'Optic White'],
        ['Ice Blue', 'Jet Black'],
        ['Silver', 'Jet Black'],
        ['Icy Lilac', 'Optic White'],
        ['Ice Blue', 'Silver'],
      ],
    },
    warm: {
      best: [
        ['#C99A30', 'Saffron'],
        ['#B0643A', 'Copper'],
        ['#8E2B22', 'Brick Red'],
        ['#0F6B67', 'Peacock'],
        ['#6F7336', 'Olive'],
      ],
      acceptable: [
        ['#F3E7CF', 'Cream'],
        ['#BB9164', 'Camel'],
        ['#B3A582', 'Khaki'],
        ['#CF8565', 'Terracotta'],
        ['#274D36', 'Forest'],
      ],
      bestCombos: [
        ['Saffron', 'Forest'],
        ['Copper', 'Cream'],
        ['Brick Red', 'Camel'],
        ['Peacock', 'Cream'],
        ['Olive', 'Khaki'],
      ],
      haCombos: [
        ['Cream', 'Camel'],
        ['Khaki', 'Forest'],
        ['Terracotta', 'Cream'],
        ['Camel', 'Forest'],
        ['Khaki', 'Cream'],
      ],
    },
    neutral: {
      best: [
        ['#A3182F', 'Ruby'],
        ['#0B6E73', 'Teal'],
        ['#C8A04A', 'Antique Gold'],
        ['#2F4DA0', 'Ultramarine'],
        ['#9A2B69', 'Berry'],
      ],
      acceptable: [
        ['#F7F6F2', 'Optic White'],
        ['#B9B8B4', 'Dove Grey'],
        ['#CDBFA8', 'Sand'],
        ['#DCA3A7', 'Blush Rose'],
        ['#1F2A44', 'Midnight Navy'],
      ],
      bestCombos: [
        ['Ruby', 'Sand'],
        ['Teal', 'Optic White'],
        ['Antique Gold', 'Teal'],
        ['Ultramarine', 'Optic White'],
        ['Berry', 'Dove Grey'],
      ],
      haCombos: [
        ['Optic White', 'Dove Grey'],
        ['Sand', 'Optic White'],
        ['Blush Rose', 'Dove Grey'],
        ['Midnight Navy', 'Sand'],
        ['Dove Grey', 'Midnight Navy'],
      ],
    },
  },
};
