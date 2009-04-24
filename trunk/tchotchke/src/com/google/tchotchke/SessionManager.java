package com.google.tchotchke;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URL;
import java.net.URLEncoder;
import java.security.GeneralSecurityException;
import java.util.logging.Logger;
import java.util.regex.Pattern;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.gdata.client.http.AuthSubUtil;
import com.google.gdata.util.AuthenticationException;

// TODO: Comment and add logging
public class SessionManager extends NavigationManager {

  private HttpServletRequest request;
  private HttpServletResponse response;

  private static final String SCOPE = "http://gdata.youtube.com";
  private static final String TOKEN_PROPERTY = "Token";
  private static final String COOKIE_NAME = "TCHOTCHKE_TOKEN";
  private static final Logger log = Logger.getLogger(SessionManager.class
      .getName());

  public SessionManager(HttpServletRequest req, HttpServletResponse resp) {

    super(req);
    this.request = req;
    this.response = resp;
  }

  public boolean isLoggedIn() {
    return this.getToken() != null;
  }

  public String getToken() {
    String token = (String) this.request.getSession().getAttribute(
        TOKEN_PROPERTY);

    if (token == null) {
      Cookie cookie = getMagicCookie();
      if (cookie != null) {
        token = cookie.getValue();
      }
    }

    if (isTokenValid(token)) {
      return token;
    } else {
      return null;
    }
  }

  public static boolean isTokenValid(String token) {
    try {
      AuthSubUtil.getTokenInfo(token, null);
    } catch (AuthenticationException e) {
      return false;
    } catch (IOException e) {
      return false;
    } catch (GeneralSecurityException e) {
      return false;
    }
    return true;
  }

  public String getYouTubeUsername() {
    String username = (String) request.getSession().getAttribute("YTUsername");

    if (username == null) {
      YouTubeApiManager ytManager = new YouTubeApiManager();
      String token = getToken();
      if(token == null) {
        log.warning("User not logged in, but getYouTubeUsername() called");
        return "YouTuber";
      }
      ytManager.setToken(token);
      username = ytManager.getCurrentUsername();
      if (username != null) {
        log.info("Caching the username for: " + username);
        request.getSession().setAttribute("YTUsername", username);
      }
    }

    if (username == null) {
      log.warning("Can't determine YT username for token.");
      return "YouTuber";
    } else {
      return username;
    }
  }

  public String getAuthSubLink() {
    return AuthSubUtil.getRequestUrl(getNextUrl(), SCOPE, false, true);
  }

  public String getSelfUrl() {
    StringBuilder selfUrl = new StringBuilder();
    selfUrl.append(request.getScheme()).append("://");
    selfUrl.append(request.getServerName());

    if (request.getServerPort() != 80) {
      selfUrl.append(":").append(request.getServerPort());
    }

    return selfUrl.toString();
  }

  public String getNextUrl() {

    StringBuilder nextUrl = new StringBuilder(getSelfUrl());

    nextUrl.append("/handleToken");

    String next = request.getParameter("page");

    if (next != null) {
      nextUrl.append("?next=").append(next);
    }

    return nextUrl.toString();
  }

  public void upgradeToken() throws IOException {
    String token = AuthSubUtil.getTokenFromReply(request.getQueryString());

    if (token == null) {
      response.sendError(HttpServletResponse.SC_BAD_REQUEST,
          "No token specified.");
      return;
    }

    try {
      String next = request.getParameter("next");
      if (next != null) {
        String whitelist = System
            .getProperty("com.google.tchotchke.RedirectWhitelist");
        URL nextUrl = new URL(next);
        if (Pattern.matches(whitelist, nextUrl.getHost())) {
          String sessionToken = AuthSubUtil
              .exchangeForSessionToken(token, null);
          request.getSession().setAttribute(TOKEN_PROPERTY, sessionToken);
          setMagicCookie(sessionToken);
          response.sendRedirect(next);
        } else {
          response.sendError(HttpServletResponse.SC_BAD_REQUEST,
              "Illegal redirecton URL.");
        }
      } else {
        response.sendError(HttpServletResponse.SC_BAD_REQUEST,
            "Missing redirection URL");
      }
    } catch (AuthenticationException e) {
      response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
          "Server rejected one time use token.");
    } catch (GeneralSecurityException e) {
      response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
          "Security error while retrieving session token.");
    }
    return;
  }

  public void destroySession() throws IOException {

    String token = getToken();

    if (token != null) {
      try {
        AuthSubUtil.revokeToken(token, null);
      } catch (AuthenticationException e) {
        log.warning("Authentication error revoking token: " + token);
      } catch (GeneralSecurityException e) {
        log.warning("Security error revoking token: " + token);
      }
    }

    request.getSession().invalidate();
    removeMagicCookie();

    response.sendRedirect(getVideoWidgetLink());
  }

  private Cookie getMagicCookie() {
    Cookie[] cookies = request.getCookies();
    if (cookies == null) {
      return null;
    }
    for (Cookie cookie : cookies) {
      if (COOKIE_NAME.equals(cookie.getName())) {
        return cookie;
      }
    }
    return null;
  }

  private void removeMagicCookie() {
    Cookie cookie = new Cookie(COOKIE_NAME, "");
    cookie.setMaxAge(0);
    response.addCookie(cookie);
  }

  private void setMagicCookie(String token) {
    Cookie cookie = new Cookie(COOKIE_NAME, token);
    // cookie lives for a year
    cookie.setMaxAge(31536000);
    response.addCookie(cookie);
  }

  public void setUploadToken(String token, String url) {
    request.getSession().setAttribute("upload_token", token);
    request.getSession().setAttribute("upload_url", url);
  }

  public boolean isUploadingVideo() {
    String token = (String) request.getSession().getAttribute("upload_token");
    String url = (String) request.getSession().getAttribute("upload_url");
    return (token != null && url != null);
  }

  public String getVideoUploadToken() {
    String token = (String) request.getSession().getAttribute("upload_token");
    if (token != null) {
      return token;
    } else {
      return "";
    }
  }

  public String getVideoUploadPostUrl() {
    String url = (String) request.getSession().getAttribute("upload_url");
    if (url != null) {
      StringBuilder nextUrl = new StringBuilder(url);
      nextUrl.append("?nexturl=");
      try {
        String uploadServlet = getSelfUrl() + getVideoMetaDataLink();
        nextUrl.append(URLEncoder.encode(uploadServlet, "UTF-8"));
      } catch (UnsupportedEncodingException e) {
        log.severe("Sky is falling, hard-coded string for encoding is wrong.");
      }
      return nextUrl.toString();
    } else {
      return "";
    }
  }

  /**
   * A flash is a message that appears only once to the user.
   * 
   * @param name The name of the flash.
   * @param message The message content of the flash.
   */
  public void setFlash(String name, String message) {
    request.getSession().setAttribute("flash-" + name, message);
  }

  public boolean hasFlash(String name) {
    return (request.getSession().getAttribute("flash-" + name) != null);
  }

  public String getFlash(String name) {
    String message = (String) request.getSession()
        .getAttribute("flash-" + name);
    request.getSession().removeAttribute("flash-" + name);
    return message;
  }

}
