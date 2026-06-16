function resolveDeletedValue(card, deletedOverride) {
  if (deletedOverride !== undefined) {
    return deletedOverride;
  }

  return card.deleted === 0 || card.deleted === null ? null : card.deleted;
}

function serializeCard(card, options = {}) {
  const { includeAccessCode = true, deletedOverride, updatedOverride } = options;

  const result = {
    id: card._id.toString(),
    title: card.title,
    slug: card.slug,
    creator_reference: card.creator_reference,
    status: card.status,
    access_type: card.access_type,
    created: card.created,
    updated: updatedOverride !== undefined ? updatedOverride : card.updated,
    deleted: resolveDeletedValue(card, deletedOverride),
  };

  if (card.description) {
    result.description = card.description;
  }

  if (card.links && card.links.length > 0) {
    result.links = card.links;
  }

  if (card.service_rates) {
    result.service_rates = card.service_rates;
  }

  if (includeAccessCode) {
    result.access_code = card.access_code ?? null; // eslint-disable-line camelcase
  }

  return result;
}

module.exports = serializeCard;
