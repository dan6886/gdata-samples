<%@ page import="org.apache.commons.lang.StringEscapeUtils" %>
<%@ page import="com.google.tchotchke.ModerationController" %>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" 
   "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
<% 
 ModerationController controller = new ModerationController(request); 
 %>
<head>
  <title>Videos!</title>
</head>
<body>
  <div>
    <h1>Moderation!</h1>
  </div>
  <div>
    <p><%= controller.getVideoSubmissions() %></p>
  </div>
  <div>
  <% if(controller.hasPrevPage()) { %>
    <a href="<%= controller.getPrevPageUrl() %>">Prev</a>
  <% } %>
  <% if(controller.hasNextPage()) { %>
    <a href="<%= controller.getNextPageUrl() %>">Next</a>
  <% } %>
  </div>
</body>
</html>