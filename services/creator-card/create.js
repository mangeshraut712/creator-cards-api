const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const { CreatorCard } = require('@app/models');
const { ulid } = require('@app-core/randomness');
const generateRandomAlphanumeric = require('./helpers/generate-random-alphanumeric');

const createSpec = `root {
  title string<minlength:3|maxlength:100>
  description? string<maxlength:500>
  slug? string<minlength:5|maxlength:50>
  creator_reference string<length:20>
  links[]? {
    title string<minlength:1|maxlength:100>
    url string<maxlength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<minlength:3|maxlength:100>
      description string<maxlength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<length:6>
}`;

const parsedCreateSpec = validator.parse(createSpec);

function generateSlugFromTitle(title) {
  const slug = title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
  return slug;
}

function serializeCard(card) {
  const { _id, __v, ...rest } = card;
  return {
    id: _id,
    ...rest,
  };
}

async function createCreatorCard(serviceData) {
  // Validate incoming data with VSL
  const validatedData = validator.validate(serviceData, parsedCreateSpec);

  // Business rule: access_code is required when access_type is private
  const accessType = validatedData.access_type || 'public';
  if (accessType === 'private' && !validatedData.access_code) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED, 'AC01');
  }

  // Business rule: access_code must not be set on public cards
  if (accessType !== 'private' && validatedData.access_code) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_NOT_ALLOWED, 'AC05');
  }

  // Validate access_code is alphanumeric when provided
  if (validatedData.access_code && !/^[a-zA-Z0-9]+$/.test(validatedData.access_code)) {
    throwAppError('access_code must be alphanumeric (letters and numbers only)', 'SPCL_VALIDATION');
  }

  // Validate each link URL starts with http:// or https://
  if (validatedData.links && validatedData.links.length > 0) {
    validatedData.links.forEach((link) => {
      if (!link.url.startsWith('http://') && !link.url.startsWith('https://')) {
        throwAppError(
          `Link URL must start with http:// or https://: ${link.url}`,
          'SPCL_VALIDATION'
        );
      }
    });
  }

  // Validate service_rates amounts are integers (no decimals)
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

  // Handle slug: auto-generate if not provided
  let { slug } = validatedData;
  if (!slug) {
    slug = generateSlugFromTitle(validatedData.title);

    // If the result is shorter than 5 characters OR already taken by another card,
    // append a hyphen followed by a random 6-character alphanumeric suffix
    let needsSuffix = slug.length < 5;
    const existingCard = await CreatorCard.findOne({ slug, deleted: null }).exec();
    if (existingCard) {
      needsSuffix = true;
    }

    if (needsSuffix) {
      const suffix = generateRandomAlphanumeric(6);
      slug = `${slug}-${suffix}`;
    }
  } else {
    // Validate slug format: letters, numbers, hyphens and underscores only
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      throwAppError(
        'Slug can only contain letters, numbers, hyphens and underscores',
        'SPCL_VALIDATION'
      );
    }
    // Slug was provided by client - check uniqueness
    const existingCard = await CreatorCard.findOne({ slug, deleted: null }).exec();
    if (existingCard) {
      throwAppError(CreatorCardMessages.SLUG_TAKEN, 'SL02');
    }
  }

  const id = ulid();
  const now = Date.now();

  const cardData = {
    _id: id,
    title: validatedData.title,
    slug,
    creator_reference: validatedData.creator_reference,
    status: validatedData.status,
    access_type: accessType,
    access_code: accessType === 'private' ? validatedData.access_code : null,
    created: now,
    updated: now,
    deleted: null,
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

  const card = await CreatorCard.create(cardData);

  // Serialize: Map _id to id, omit __v
  return serializeCard(card.toObject());
}

module.exports = createCreatorCard;
