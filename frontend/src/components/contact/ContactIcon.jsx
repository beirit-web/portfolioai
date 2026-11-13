import React from "react";

const paths = {
  name: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  email: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>,
  phone: <path d="M7 3H4a1 1 0 0 0-1 1c0 9 8 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 2a15 15 0 0 1-7-7l2-2-2-5Z" />,
  subject: <><path d="M4 6h16M4 12h11M4 18h7" /><circle cx="19" cy="18" r="2" /></>,
  message: <><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2Z" /><path d="M7 9h10M7 13h7" /></>,
  shield: <><path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
  send: <><path d="m21 3-7 18-4-7-7-4 18-7Z" /><path d="m10 14 6-6" /></>,
};

export default function ContactIcon({ name, className = "" }) {
  return (
    <svg className={`contact-icon ${className}`.trim()} width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false">
      {paths[name] || paths.message}
    </svg>
  );
}
