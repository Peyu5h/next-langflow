import React from "react";

type propType = {
  text: string;
};

const HoverUp = ({ text }: propType) => {
  return (
    <div className="group relative flex cursor-pointer overflow-hidden text-sm leading-6 uppercase">
      <div className="inline-block p-1 transition duration-500 ease-out group-hover:-translate-y-[110%]">
        {text}
      </div>
      <div className="absolute left-0 translate-y-[110%] rotate-12 p-1 transition duration-500 ease-out group-hover:translate-y-0 group-hover:rotate-0">
        {text}
      </div>
    </div>
  );
};

export default HoverUp;
