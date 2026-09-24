package com.chessmovereader;

import org.springframework.boot.SpringApplication;

public class TestChessMoveReaderApiApplication {

	public static void main(String[] args) {
		SpringApplication.from(ChessMoveReaderApiApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
