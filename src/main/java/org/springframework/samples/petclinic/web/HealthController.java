/*
 * Copyright 2002-2024 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.springframework.samples.petclinic.web;

import java.sql.Connection;
import java.util.LinkedHashMap;
import java.util.Map;

import javax.sql.DataSource;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * Health-check endpoint for container orchestrators and AWS load balancers.
 * Returns HTTP 200 with {@code {"status":"UP","database":"UP"}} when the
 * datasource hands out a valid connection, HTTP 503 otherwise.
 */
@Controller
public class HealthController {

    private static final int VALIDATION_TIMEOUT_SECONDS = 2;

    private final ObjectProvider<DataSource> dataSource;

    @Autowired
    public HealthController(ObjectProvider<DataSource> dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping(value = "/health", produces = "application/json")
    @ResponseBody
    public ResponseEntity<Map<String, String>> health() {
        boolean databaseUp = isDatabaseUp();
        Map<String, String> body = new LinkedHashMap<>();
        body.put("status", databaseUp ? "UP" : "DOWN");
        body.put("database", databaseUp ? "UP" : "DOWN");
        return new ResponseEntity<>(body, databaseUp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    }

    private boolean isDatabaseUp() {
        DataSource target = this.dataSource.getIfAvailable();
        if (target == null) {
            return false;
        }
        try (Connection connection = target.getConnection()) {
            return connection.isValid(VALIDATION_TIMEOUT_SECONDS);
        } catch (Exception ex) {
            return false;
        }
    }

}
