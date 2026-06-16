const generateRandomAlphanumeric = require('./generate-random-alphanumeric');

const SLUG_ALLOWED_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-_';

function isValidSlugCharacter(char) {
  return SLUG_ALLOWED_CHARS.includes(char);
}

function isValidSlugFormat(slug) {
  if (!slug) {
    return false;
  }

  for (let i = 0; i < slug.length; i++) {
    if (!isValidSlugCharacter(slug[i])) {
      return false;
    }
  }

  return true;
}

function generateSlugFromTitle(title) {
  const words = title.toLowerCase().split(' ');
  const hyphenated = words.join('-');

  let cleaned = '';
  for (let i = 0; i < hyphenated.length; i++) {
    if (isValidSlugCharacter(hyphenated[i])) {
      cleaned += hyphenated[i];
    }
  }

  return cleaned;
}

async function resolveUniqueSlug(baseSlug, findExistingBySlug) {
  let slug = baseSlug;
  let needsSuffix = slug.length < 5;

  if (!needsSuffix) {
    const existingCard = await findExistingBySlug(slug);
    if (existingCard) {
      needsSuffix = true;
    }
  }

  if (!needsSuffix) {
    return slug;
  }

  let isUnique = false;

  while (!isUnique) {
    const suffix = generateRandomAlphanumeric(6);
    slug = baseSlug.length > 0 ? `${baseSlug}-${suffix}` : suffix;
    const existingCard = await findExistingBySlug(slug); // eslint-disable-line no-await-in-loop
    isUnique = !existingCard;
  }

  return slug;
}

module.exports = {
  generateSlugFromTitle,
  isValidSlugFormat,
  resolveUniqueSlug,
};
