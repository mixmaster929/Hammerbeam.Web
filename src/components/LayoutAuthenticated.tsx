import Head from "next/head";
import { useApi } from '../contexts/useApi';
import { useCallback, useEffect, useState } from "react";
import Cookies from "js-cookie";
import Router from "next/router";
import IdlePopup from "./IdlePopup";
import configSettings from "../../config.json";
import StatusBar from "./StatusBar";

interface ILayoutAuthenticated {
  children: any
}
  
const emailAddressCookieName = "hammer_username";
const accessTokenCookieName = "hammer_access_token";
const refreshTokenCookieName = "hammer_refresh_token";
const expirationCookieName = "hammer_expiration";

const LayoutAuthenticated = ({children}: ILayoutAuthenticated) => {    
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isIdlePopupOpen, setIsIdlePopupOpen] = useState(false);
  const [lastActiveTime, setLastActiveTime] = useState(Date.now());
  const [idleLifeRemaining, setIdleLifeRemaining] = useState(100);

  const { oauthAccessTokenLifeRemaining, clearOAuthCookies, isMakingRequest } = useApi();
  
  const domEvents = ["click", "scroll", "keypress"];
  //cconst domEvents = ["click", "scroll", "keypress", "mousemove"];

  var idleTimer: ReturnType<typeof setTimeout>;

  useEffect(() => {
    clearInterval(idleTimer);

    const emailAddress = Cookies.get(emailAddressCookieName);
    const accessToken = Cookies.get(accessTokenCookieName);
    const refreshToken = Cookies.get(refreshTokenCookieName);
    const expiration = Cookies.get(expirationCookieName);
    
    if (emailAddress && accessToken && refreshToken && expiration) {
      setIsAuthenticated(true);       
      resetIdleTimer();
    }
    else {      
      setIsAuthenticated(false);
      redirectUnauthenticated();
    }
  }, []);

  const resetIdleTimer = useCallback(() => {
    const now = Date.now();
    setLastActiveTime(now);
    clearInterval(idleTimer);

    idleTimer = setInterval(() => {
      const secondsRemaining = configSettings.idleTimeout - Math.round((Date.now() - now) / 1000);
      const precentTimeRemaining = 100 * secondsRemaining / configSettings.idleTimeout;
      setIdleLifeRemaining(precentTimeRemaining);
    }, 1000);    
  }, []);

  const redirectUnauthenticated = () => {
    if (Router.pathname.indexOf("/login") < 0)
      Router.push("/login?" + encodeURIComponent(Router.pathname.toString()));
    else
      Router.push("/login");
  }
  
  const onIdlePopupClose = useCallback((isLogout: boolean) => {
    setIsIdlePopupOpen(false);

    if (isLogout) {
      clearOAuthCookies();
      clearInterval(idleTimer);
      redirectUnauthenticated();      
    } else 
    {
      clearInterval(idleTimer);
      setLastActiveTime(Date.now());
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      setIsIdlePopupOpen(true);
    }, configSettings.idleTimeout * 1000);

    return clearTimeout.bind(null, id);
  }, [lastActiveTime]);

  useEffect(() => {
    domEvents.forEach((event: any) => document.addEventListener(event, resetIdleTimer));

    return () => {
      domEvents.forEach((event: any) =>
        document.removeEventListener(event, resetIdleTimer)
      );
    };
  }, [resetIdleTimer]);
  
  return (
    <>
    <Head>
      <title>Hammerbeam</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />      
      <style data-href="https://fonts.googleapis.com/css2?family=Lato"></style>
    </Head>
    <IdlePopup isOpen={isIdlePopupOpen} onClose={onIdlePopupClose}></IdlePopup>
    <div className={`auth-container ${isAuthenticated ? "" : "not-authenticated"} ${isMakingRequest ? "making-api-request" : ""}`}>
      <div className="top-bar">
        <div className="status-bars">
          <StatusBar id="oauth-token-timeout" icon="cloud" warningAt={10 + configSettings.oauthAccessTokenRefreshMarginPercent} complete={oauthAccessTokenLifeRemaining}></StatusBar>
          <StatusBar id="idle-timeout" icon="bed" warningAt={10} complete={idleLifeRemaining}></StatusBar>          
        </div>          
      </div>
      <div className="container-fluid">          
        <main>{children}</main>        
      </div>
    </div>            
    </>
    );
  }

  export default LayoutAuthenticated
  