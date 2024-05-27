const getNextSequenceValue = async (modelName) => {
  const sequenceDocument = await Sequence.findOneAndUpdate(
    { modelName },
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true }
  );

  return sequenceDocument.sequenceValue;
};

module.exports = getNextSequenceValue;
