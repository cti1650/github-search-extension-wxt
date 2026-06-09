type ButtonsItem = {
  label: string;
  onClick: (label: string) => void;
};

type Props = {
  label: string;
  buttons?: ButtonsItem[];
};

export const Buttons = ({ label, buttons }: Props) => {
  const cols = (buttons?.length ?? 0) <= 2 ? 'grid-cols-2' : 'grid-cols-3';
  return (
    <>
      <div className="mt-2 mb-0.5 text-gray-400 text-xs">{label}</div>
      <div className={`grid ${cols} gap-2`}>
        {buttons?.map((button) => (
          <button
            key={button.label}
            type="button"
            onClick={() => button.onClick(button.label)}
            className="py-1 text-white text-sm focus:text-blue-400 bg-gray-700 border border-gray-500 focus:border-blue-400 rounded-lg focus:outline-none"
          >
            {button.label}
          </button>
        ))}
      </div>
    </>
  );
};
