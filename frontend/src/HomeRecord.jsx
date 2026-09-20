import React, {
  useEffect,
  useState,
} from "react";

import { api } from "./api.js";

function eloText(value) {
  const number = Number(value || 0);

  return Number.isInteger(number)
    ? String(number)
    : number.toFixed(2).replace(".", ",");
}

export default function HomeRecord() {
  const [record, setRecord] = useState(null);

  useEffect(() => {
    api
      .get("/elo-records")
      .then((response) => {
        setRecord(response.data?.[0] || null);
      })
      .catch(() => setRecord(null));
  }, []);

  if (!record) {
    return null;
  }

  return (
    <aside className="home-record-card">
      <small>RÉCORD HISTÓRICO · PRIMERA</small>
      <strong>{record.pair_name}</strong>
      <span>
        {eloText(record.elo)} ELO · {Number(record.defenses || 0)} defensas
      </span>
    </aside>
  );
}
