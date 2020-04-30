import React, { useState, useEffect, useContext } from "react";
import { useTheme } from "@material-ui/core/styles";
import { Typography } from "@material-ui/core";
import { DndProvider } from "react-dnd";
import Backend from "react-dnd-html5-backend";

import * as FirestoreService from "./services/firestore";
import * as LoggerService from "./services/logger";
import { store } from "./store.js";

import CreateEvent from "./containers/CreateEvent/CreateEvent";
import JoinEvent from "./containers/JoinEvent/JoinEvent";
import Event from "./containers/Event/Event";
import ErrorMessage from "./components/ErrorMessage/ErrorMessage";

import useQueryString from "./hooks/useQueryString";

function App() {
  const { currentUser, event, setEvent } = useContext(store);
  const [userId, setUserId] = useState();
  const [error, setError] = useState();
  const [isLoading, setIsLoading] = useState(true);

  const [eventId, setEventId] = useQueryString("eventId");
  const { palette } = useTheme();

  const theme = {
    container: {
      background: palette.primary.main,
      width: "100%",
      height: "100vh",
    },
  };

  useEffect(() => {
    FirestoreService.authenticateAnonymously()
      .then((userCredential) => {
        setUserId(userCredential.user.uid);
        if (eventId) {
          return FirestoreService.getEvent(eventId)
            .then((event) => {
              if (event.exists) {
                setError(null);
                setEvent({ eventId, ...event.data() }, userCredential.user.uid);
              } else {
                setError("event-not-found");
                setEventId();
              }
            })
            .catch((err) => {
              console.log("Get event error: ", err);
              setError("event-get-fail");
            });
        }
      })
      .then(() => setIsLoading(false))
      .catch((err) => {
        console.log("auth err ", err);
        setError("anonymous-auth-failed");
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onEventCreate(eventId, userName) {
    try {
      const event = await FirestoreService.getEvent(eventId);
      if (!event.exists) {
        setError("event-not-found");
        setEventId();
        return;
      }
      setEventId(eventId);
      setEvent({ eventId, ...event.data() }, userId);
      setError(null);
    } catch (err) {
      console.log(err);
      setError("event-get-fail");
    }
  }

  if (isLoading)
    return (
      <div
        style={{
          ...theme.container,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h3"
          color="secondary"
          style={{ marginBottom: "80px" }}
        >
          VirtualDojo Rooms
        </Typography>
      </div>
    );
  if (event && currentUser) {
    return (
      <DndProvider backend={Backend}>
        <div style={theme.container}>
          <Event user={currentUser} event={event} />
        </div>
      </DndProvider>
    );
  } else if (event) {
    return (
      <div style={theme.container}>
        <ErrorMessage errorCode={error}></ErrorMessage>
        <JoinEvent userId={userId} />
      </div>
    );
  }
  return (
    <div style={theme.container}>
      <ErrorMessage errorCode={error} />
      <CreateEvent onCreate={onEventCreate} userId={userId} />
    </div>
  );
}

export default App;
