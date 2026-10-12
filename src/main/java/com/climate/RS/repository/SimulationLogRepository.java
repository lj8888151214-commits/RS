package com.climate.RS.repository;

import com.climate.RS.entity.SimulationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SimulationLogRepository extends JpaRepository<SimulationLog, Long> {
}