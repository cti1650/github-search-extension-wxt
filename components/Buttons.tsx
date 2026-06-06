type ButtonsItem = {
  label: string;
  onClick: (label: string) => void;
};

type Props = {
  label: string;
  buttons?: ButtonsItem[];
};

export const Buttons = ({ label, buttons }: Props) => {
  return (
    <>
      <div className="mt-2 mb-0.5 text-gray-400 text-xs">{label}</div>
      <div className="grid grid-cols-2 space-x-2">
        {buttons?.map((button) => (
          <button
            key={button.label}
            type="button"
            onClick={() => button.onClick(button.label)}
            className="py-1 text-white focus:text-blue-400 bg-gray-700 border border-gray-500 focus:border-blue-400 rounded-lg focus:outline-none"
          >
            {button.label}
          </button>
        ))}
      </div>
    </>
  );
};
