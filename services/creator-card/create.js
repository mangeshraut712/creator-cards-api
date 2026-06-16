const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { ulid } = require('@app-core/randomness');
const { CreatorCardMessages } = require('@app/messages');
const creatorCardRepository = require('@app/repository/creator-card');
const serializeCard = require('./helpers/serialize-card');
const {
  generateSlugFromTitle,
  isValidSlugFormat,
  resolveUniqueSlug,
} = require('./helpers/slug-utils');
const { isAlphanumeric, isValidLinkUrl } = require('./helpers/validation-utils');

const createSpec = `root {
  title string<minLength:3|maxLength:100>
  description? string<maxLength:500>
  slug? string<minLength:5|maxLength:50>
  creator_reference string<length:20>
  links[]? {
    title string<minLength:1|maxLength:100>
    url string<maxLength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<minLength:3|maxLength:100>
      description string<maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<length:6>
}`;

const parsedCreateSpec = validator.parse(createSpec);

async function createCreatorCard(serviceData) {
  const validatedData = validator.validate(serviceData, parsedCreateSpec);

  const accessType = validatedData.access_type || 'public';

  if (accessType === 'private' && !validatedData.access_code) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED, 'AC01');
  }

  if (accessType !== 'private' && validatedData.access_code) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_NOT_ALLOWED, 'AC05');
  }

  if (validatedData.access_code && !isAlphanumeric(validatedData.access_code)) {
    throwAppError('access_code must be alphanumeric (letters and numbers only)', 'SPCL_VALIDATION');
  }

  if (validatedData.links && validatedData.links.length > 0) {
    validatedData.links.forEach((link) => {
      if (!isValidLinkUrl(link.url)) {
        throwAppError(
          `Link URL must start with http:// or https://: ${link.url}`,
          'SPCL_VALIDATION'
        );
      }
    });
  }

  if (validatedData.service_rates && validatedData.service_rates.rates) {
    validatedData.service_rates.rates.forEach((rate) => {
      if (!Number.isInteger(rate.amount)) {
        throwAppError(
          `Rate amount must be a positive integer (no decimals): ${rate.amount}`,
          'SPCL_VALIDATION'
        );
      }
    });
  }

  let { slug } = validatedData;

  if (!slug) {
    const baseSlug = generateSlugFromTitle(validatedData.title);
    slug = await resolveUniqueSlug(baseSlug, async (candidateSlug) =>
      creatorCardRepository.findOne({ query: { slug: candidateSlug } })
    );
  } else {
    if (!isValidSlugFormat(slug)) {
      throwAppError(
        'Slug can only contain letters, numbers, hyphens and underscores',
        'SPCL_VALIDATION'
      );
    }

    const existingCard = await creatorCardRepository.findOne({ query: { slug } });
    if (existingCard) {
      throwAppError(CreatorCardMessages.SLUG_TAKEN, 'SL02');
    }
  }

  const now = Date.now();

  const cardData = {
    _id: ulid(),
    title: validatedData.title,
    slug,
    creator_reference: validatedData.creator_reference,
    status: validatedData.status,
    access_type: accessType,
    access_code: accessType === 'private' ? validatedData.access_code : null,
    created: now,
    updated: now,
    deleted: 0,
  };

  if (validatedData.description) {
    cardData.description = validatedData.description;
  }

  if (validatedData.links && validatedData.links.length > 0) {
    cardData.links = validatedData.links;
  }

  if (validatedData.service_rates) {
    cardData.service_rates = validatedData.service_rates;
  }

  const card = await creatorCardRepository.create(cardData);
  const serializedResponse = serializeCard(card);

  return serializedResponse;
}

module.exports = createCreatorCard;
