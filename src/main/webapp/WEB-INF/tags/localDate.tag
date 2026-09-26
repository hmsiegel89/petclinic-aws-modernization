<%@ tag body-content="empty" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>

<%@ taglib prefix="fmt" uri="jakarta.tags.fmt" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>

<%@ attribute name="date" required="true" type="java.time.LocalDate" %>
<%@ attribute name="pattern" required="true" type="java.lang.String" %>


<fmt:parseDate value="${date}" pattern="yyyy-MM-dd" var="parsedDate" type="date"/>
<fmt:formatDate value="${parsedDate}" type="date" pattern="${pattern}"/>
