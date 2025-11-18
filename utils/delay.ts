const delay = async (millisecond: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, millisecond));
};

export default delay;
