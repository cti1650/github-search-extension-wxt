import type { ReactNode } from 'react';
import { Title } from './Title';

type Props = {
  title: string;
  children: ReactNode;
};

export const Layout = ({ title, children }: Props) => {
  return (
    <div className="my-1">
      <Title label={title} />
      <div className="flex flex-col">{children}</div>
    </div>
  );
};
