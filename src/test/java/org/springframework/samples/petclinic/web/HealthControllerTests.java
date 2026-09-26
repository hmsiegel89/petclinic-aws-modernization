package org.springframework.samples.petclinic.web;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Connection;
import java.sql.SQLException;

import javax.sql.DataSource;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Test class for {@link HealthController}.
 */
class HealthControllerTests {

    @SuppressWarnings("unchecked")
    private static MockMvc mockMvcFor(DataSource dataSource) {
        ObjectProvider<DataSource> provider = mock(ObjectProvider.class);
        given(provider.getIfAvailable()).willReturn(dataSource);
        return MockMvcBuilders.standaloneSetup(new HealthController(provider)).build();
    }

    @Test
    void shouldReportUpWhenTheDatabaseAnswers() throws Exception {
        Connection connection = mock(Connection.class);
        given(connection.isValid(ArgumentMatchers.anyInt())).willReturn(true);
        DataSource dataSource = mock(DataSource.class);
        given(dataSource.getConnection()).willReturn(connection);

        mockMvcFor(dataSource).perform(get("/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"))
            .andExpect(jsonPath("$.database").value("UP"));
    }

    @Test
    void shouldReportDownWhenTheDatabaseIsUnreachable() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        given(dataSource.getConnection()).willThrow(new SQLException("boom"));

        mockMvcFor(dataSource).perform(get("/health"))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.status").value("DOWN"));
    }

    @Test
    void shouldReportDownWhenNoDataSourceIsConfigured() throws Exception {
        mockMvcFor(null).perform(get("/health"))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.database").value("DOWN"));
    }

}
